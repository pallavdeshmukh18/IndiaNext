import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Settings,
  ShieldAlert,
  Volume2,
  VolumeX
} from 'lucide-react';
import { threatApi } from '../lib/api';
import './WorkspacePages.css';
import './ScreenMonitor.css';

const AI_PROVIDERS = [
  { key: 'backend', label: 'Backend OCR', note: 'IndiaNext server - best for readable screen text' },
  { key: 'gemini', label: 'Gemini 2.5 Flash', note: 'Google - direct browser vision scan' },
  { key: 'openai', label: 'GPT-4o', note: 'OpenAI' },
  { key: 'grok', label: 'Grok Vision', note: 'xAI' }
];

const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash'
];

const SYSTEM_PROMPT = `You are an expert cybersecurity analyst monitoring a user's screen in real time.
Your task is to inspect each screenshot and detect any security threats, including:
- Phishing pages or fake login forms harvesting credentials
- Scam popups, fake alerts, prize notifications, or urgency manipulation
- Social engineering tactics or impersonation of trusted brands
- Malicious or suspicious URLs visible on screen
- Deepfake or AI-generated deceptive media
- Suspicious software behaviour, unauthorized access prompts, or data exfiltration signs

Respond ONLY with a valid JSON object - no markdown, no explanation outside the JSON:
{
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "riskScore": <integer 0-100>,
  "threatType": "<short threat label or 'No Threat Detected'>",
  "explanation": "<1-2 sentences max - will be read aloud>",
  "recommendation": "<one concrete action>"
}

If the screen appears safe, set riskLevel to LOW and riskScore below 15.`;

const STORAGE_KEY_API = 'sm.apiKey';
const STORAGE_KEY_PROVIDER = 'sm.provider';
const ENV_GEMINI_API_KEY = String(
  import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || ''
).trim();
const DIRECT_AI_TIMEOUT_MS = 20000;
const BACKEND_AI_TIMEOUT_MS = 90000;

function deriveRiskLevel(riskScore) {
  if (riskScore >= 75) return 'HIGH';
  if (riskScore >= 40) return 'MEDIUM';
  return 'LOW';
}

function normalizeMonitorResult(rawResult) {
  const rawRiskScore = Number(rawResult?.riskScore);
  const riskScore = Number.isFinite(rawRiskScore)
    ? Math.max(0, Math.min(100, Math.round(rawRiskScore)))
    : 0;
  const rawRiskLevel = String(rawResult?.riskLevel || '').trim().toUpperCase();
  const riskLevel = ['HIGH', 'MEDIUM', 'LOW'].includes(rawRiskLevel)
    ? rawRiskLevel
    : deriveRiskLevel(riskScore);
  const threatType = String(rawResult?.threatType || '').trim();

  return {
    riskScore,
    riskLevel,
    threatType: threatType && threatType !== 'None' ? threatType : 'No Threat Detected',
    explanation: String(rawResult?.explanation || 'Screen appears clean.').trim(),
    recommendation: String(rawResult?.recommendation || '').trim()
  };
}

function dataUrlToBase64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || '';
}

function extractJsonCandidate(text) {
  const source = String(text || '').trim();
  if (!source) {
    throw new Error('Empty model response.');
  }

  const fenced = source.replace(/```json|```/gi, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Model did not return a JSON object. Raw response: ${fenced.slice(0, 200)}`);
  }

  return fenced.slice(start, end + 1);
}

function normalizeJsonLikeText(text) {
  return text
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ': "$1"')
    .replace(/,\s*([}\]])/g, '$1');
}

function parseModelJson(text) {
  const candidate = extractJsonCandidate(text);

  try {
    return JSON.parse(candidate);
  } catch {
    const normalized = normalizeJsonLikeText(candidate);
    return JSON.parse(normalized);
  }
}

async function callGemini(apiKey, base64Jpeg) {
  let lastError = null;

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SYSTEM_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }
            ]
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
        })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      lastError = new Error(err?.error?.message || `Gemini error ${res.status} on ${modelName}`);
      continue;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return parseModelJson(text);
  }

  throw lastError || new Error('No Gemini model returned a valid response.');
}

async function callOpenAI(apiKey, base64Jpeg) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this screen capture and base the answer only on what is visible in the image.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Jpeg}`, detail: 'high' } }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
  }

  const data = await res.json();
  return parseModelJson(data.choices[0].message.content);
}

async function callGrok(apiKey, base64Jpeg) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'grok-2-vision-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this screen capture and base the answer only on what is visible in the image.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Jpeg}`, detail: 'high' } }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Grok error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content;
  return parseModelJson(text);
}

async function callBackend(sessionToken, screenshotDataUrl, signal) {
  if (!sessionToken) {
    throw new Error('Sign in again to use backend screen analysis.');
  }

  const response = await threatApi.liveScreenAnalyze({
    token: sessionToken,
    payload: {
      screenshotBase64: screenshotDataUrl
    },
    signal
  });

  return normalizeMonitorResult(response);
}

async function analyzeWithAI(provider, apiKey, base64Jpeg) {
  if (provider === 'openai') return callOpenAI(apiKey, base64Jpeg);
  if (provider === 'grok') return callGrok(apiKey, base64Jpeg);
  return callGemini(apiKey, base64Jpeg);
}

async function analyzeWithTimeout(provider, { apiKey, sessionToken, screenshotDataUrl }) {
  const timeoutMs = provider === 'backend' ? BACKEND_AI_TIMEOUT_MS : DIRECT_AI_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === 'backend') {
      return await callBackend(sessionToken, screenshotDataUrl, controller.signal);
    }

    return await analyzeWithAI(provider, apiKey, dataUrlToBase64(screenshotDataUrl)).then(normalizeMonitorResult);
  } catch (error) {
    if (error?.name === 'AbortError' || String(error?.message || '').includes('timed out')) {
      throw new Error(
        provider === 'backend'
          ? `Backend screen analysis timed out after ${Math.round(timeoutMs / 1000)}s. The OCR/model pipeline is taking too long.`
          : `AI request timed out after ${Math.round(timeoutMs / 1000)}s. Check API key, quota, or network.`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const INTERVAL_OPTIONS = [
  { label: '3 s', value: 3000 },
  { label: '5 s', value: 5000 },
  { label: '10 s', value: 10000 },
  { label: '20 s', value: 20000 }
];

function riskClassName(level) {
  return `risk-pill ${String(level || 'LOW').toLowerCase()}`;
}

function captureFrame(videoEl, options = {}) {
  const { maxDimension = 1600, quality = 0.92 } = options;
  const videoWidth = videoEl.videoWidth || 0;
  const videoHeight = videoEl.videoHeight || 0;
  const longestSide = Math.max(videoWidth, videoHeight);
  const scale = longestSide > 0 ? Math.min(1, maxDimension / longestSide) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(videoWidth * scale));
  canvas.height = Math.max(1, Math.round(videoHeight * scale));
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas rendering is unavailable.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', quality);
}

function speak(text, voiceEnabled) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') return;
  const synth = window.speechSynthesis;
  synth.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.05;
  utterance.pitch = 1;
  utterance.volume = 1;
  synth.speak(utterance);
}

function primeSpeech(voiceEnabled) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') return;
  window.speechSynthesis.resume();
}

const MAX_LOG = 40;

const ScreenMonitor = ({ session }) => {
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const isScanningRef = React.useRef(false);
  const lastAnnouncementRef = React.useRef('');
  const sessionToken = session?.token || '';

  const [isSharing, setIsSharing] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [showSettings, setShowSettings] = React.useState(true);
  const [interval, setIntervalMs] = React.useState(5000);
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(STORAGE_KEY_API) || ENV_GEMINI_API_KEY || '');
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [aiProvider, setAiProvider] = React.useState(() => localStorage.getItem(STORAGE_KEY_PROVIDER) || 'backend');
  const [log, setLog] = React.useState([]);
  const [latestResult, setLatestResult] = React.useState(null);
  const [scanStatus, setScanStatus] = React.useState('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [frameCount, setFrameCount] = React.useState(0);

  React.useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  React.useEffect(() => {
    if (!isSharing || !videoRef.current || !streamRef.current) return;

    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [isSharing]);

  const appendLog = React.useCallback((entry) => {
    setLog((prev) => [entry, ...prev].slice(0, MAX_LOG));
  }, []);

  const stopSharing = React.useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    window.speechSynthesis?.cancel();
    lastAnnouncementRef.current = '';
    setIsSharing(false);
    setIsScanning(false);
    setScanStatus('idle');
  }, []);

  const runScan = React.useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;

    setScanStatus('scanning');
    setFrameCount((count) => count + 1);

    let screenshotDataUrl;
    try {
      screenshotDataUrl = captureFrame(videoRef.current);
    } catch {
      return;
    }

    const selectedProvider = aiProvider !== 'backend' && !apiKey.trim() ? 'backend' : aiProvider;

    if (selectedProvider !== 'backend' && !apiKey.trim()) {
      setScanStatus('idle');
      setErrorMsg('Enter an API key in Settings before monitoring.');
      speak('API key missing. Please add the provider API key in settings.', voiceEnabled);
      return;
    }

    try {
      const parsed = await analyzeWithTimeout(selectedProvider, {
        apiKey: apiKey.trim(),
        sessionToken,
        screenshotDataUrl
      });

      const { riskScore, riskLevel, threatType, explanation, recommendation } = parsed;
      const ts = new Date().toLocaleTimeString();
      const entry = { ts, riskScore, riskLevel, threatType, explanation, recommendation };

      setLatestResult(entry);
      appendLog(entry);
      setErrorMsg(selectedProvider !== aiProvider ? 'Selected provider had no API key, so backend OCR mode was used for this scan.' : '');

      const isSuspicious = riskLevel === 'HIGH' || riskLevel === 'MEDIUM' || riskScore >= 40;
      setScanStatus(isSuspicious ? 'suspicious' : 'safe');

      if (isSuspicious) {
        const announcement = `Security alert. ${riskLevel} risk. ${explanation} ${recommendation}`.trim();
        if (lastAnnouncementRef.current !== announcement) {
          window.speechSynthesis?.cancel();
          speak(announcement, voiceEnabled);
          lastAnnouncementRef.current = announcement;
        }
      } else {
        lastAnnouncementRef.current = '';
      }
    } catch (err) {
      setScanStatus('safe');
      setErrorMsg(`AI error: ${err.message}`);
      window.speechSynthesis?.cancel();
      speak(`AI monitoring error. ${err.message}`, voiceEnabled);
      appendLog({
        ts: new Date().toLocaleTimeString(),
        riskScore: 0,
        riskLevel: 'LOW',
        threatType: 'API error',
        explanation: err.message,
        recommendation: selectedProvider === 'backend'
          ? 'Check backend availability and your login session.'
          : 'Check your API key and selected provider.'
      });
    }
  }, [aiProvider, apiKey, appendLog, sessionToken, voiceEnabled]);

  const startScanning = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setErrorMsg('Speech is not supported in this browser. Use Chrome or Edge and allow sound.');
    }

    primeSpeech(voiceEnabled);
    window.speechSynthesis?.cancel();
    speak('Monitoring started. I will announce suspicious findings.', voiceEnabled);
    setIsScanning(true);

    setTimeout(() => {
      if (isScanningRef.current) {
        runScan();
      }
    }, 1200);

    intervalRef.current = setInterval(() => {
      if (isScanningRef.current) runScan();
    }, interval);
  }, [interval, runScan, voiceEnabled]);

  const stopScanning = React.useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsScanning(false);
    setScanStatus('idle');
    window.speechSynthesis?.cancel();
    lastAnnouncementRef.current = '';
  }, []);

  const startSharing = React.useCallback(async () => {
    setErrorMsg('');

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      streamRef.current = stream;

      stream.getVideoTracks()[0]?.addEventListener('ended', stopSharing);

      setIsSharing(true);
      setFrameCount(0);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setErrorMsg('Could not start screen capture. Your browser may not support this feature.');
      }
    }
  }, [stopSharing]);

  React.useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  const statusLabel = {
    idle: 'Idle',
    scanning: 'Scanning...',
    suspicious: 'Threat detected',
    safe: 'All clear'
  }[scanStatus];

  const clearLog = () => {
    setLog([]);
    setLatestResult(null);
  };

  const testVoiceAlert = React.useCallback(() => {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setErrorMsg('Speech is not supported in this browser. Use Chrome or Edge and allow sound.');
      return;
    }

    setErrorMsg('');
    if (!voiceEnabled) {
      setVoiceEnabled(true);
    }
    speak('Test alert. Voice output is working correctly.', true);
  }, [voiceEnabled]);

  return (
    <div className="workspace-page">
      <section className="workspace-page-hero">
        <div className="workspace-page-hero-copy">
          <div className="workspace-data-badge live">Live screen monitor</div>
          <h2>AI-powered continuous screen surveillance</h2>
          <p>
            Share your screen so IndiaNext can capture frames at regular intervals, inspect the visible content, and
            speak suspicious findings aloud in near real time.
          </p>
        </div>
        <div className="workspace-page-hero-actions">
          <button
            type="button"
            className="workspace-btn workspace-btn-secondary"
            onClick={() => setShowSettings((visible) => !visible)}
          >
            <Settings size={15} />
            Settings
          </button>
        </div>
      </section>

      {showSettings && (
        <section className="sm-settings-panel">
          <div className="sm-settings-row">
            <div className="sm-settings-field sm-settings-field-wide">
              <label className="analysis-label">AI Provider</label>
              <div className="analysis-chip-row">
                {AI_PROVIDERS.map((provider) => (
                  <button
                    key={provider.key}
                    type="button"
                    className={`analysis-channel-button${aiProvider === provider.key ? ' active' : ''}`}
                    onClick={() => {
                      setAiProvider(provider.key);
                      localStorage.setItem(STORAGE_KEY_PROVIDER, provider.key);
                    }}
                  >
                    {provider.label}
                    <span className="sm-provider-note">{provider.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm-settings-field sm-settings-field-wide">
              <label className="analysis-label">API Key</label>
              <div className="sm-apikey-row">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="sm-apikey-input"
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    localStorage.setItem(STORAGE_KEY_API, event.target.value);
                  }}
                  placeholder={
                    aiProvider === 'backend'
                      ? 'Not required for Backend OCR mode'
                      : `Paste your ${AI_PROVIDERS.find((provider) => provider.key === aiProvider)?.label} API key`
                  }
                  autoComplete="off"
                  spellCheck={false}
                  disabled={aiProvider === 'backend'}
                />
                <button
                  type="button"
                  className="analysis-channel-button"
                  style={{ flexShrink: 0 }}
                  onClick={() => setShowApiKey((visible) => !visible)}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="analysis-helper" style={{ marginTop: '0.35rem' }}>
                Backend OCR mode uses your signed-in IndiaNext session and does not require a third-party key. Gemini
                auto-loads from <strong>frontend/.env</strong> key <strong>VITE_GEMINI_API_KEY</strong> when present.
              </p>
            </div>

            <div className="sm-settings-field">
              <label className="analysis-label">Scan interval</label>
              <div className="analysis-chip-row">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`analysis-channel-button${interval === opt.value ? ' active' : ''}`}
                    onClick={() => {
                      setIntervalMs(opt.value);
                      if (isScanning) {
                        stopScanning();
                        setTimeout(() => startScanning(), 100);
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm-settings-field">
              <label className="analysis-label">Voice alerts</label>
              <div className="analysis-chip-row">
                <button
                  type="button"
                  className={`analysis-channel-button${voiceEnabled ? ' active' : ''}`}
                  onClick={() => {
                    setVoiceEnabled((enabled) => {
                      const next = !enabled;
                      if (!next) {
                        window.speechSynthesis?.cancel();
                      } else {
                        primeSpeech(true);
                      }
                      return next;
                    });
                  }}
                >
                  {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  {voiceEnabled ? 'Voice on' : 'Voice off'}
                </button>
                <button
                  type="button"
                  className="analysis-channel-button"
                  onClick={testVoiceAlert}
                >
                  <Mic size={14} />
                  Test Voice
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="sm-layout">
        <article className="sm-preview-panel analysis-form-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Screen preview</h3>
              <p>
                {aiProvider === 'backend'
                  ? 'Frames are captured locally and sent to the IndiaNext backend OCR pipeline so visible text and phishing cues can be analyzed reliably.'
                  : 'Frames are captured locally and sent from your browser to the selected vision provider.'}
              </p>
            </div>
            <ShieldAlert size={18} className="workspace-inline-icon" />
          </div>

          <div className="sm-video-container">
            {isSharing ? (
              <video
                ref={videoRef}
                className="sm-video"
                muted
                playsInline
              />
            ) : (
              <div className="sm-video-placeholder">
                <Monitor size={40} />
                <p>Start screen sharing to enable monitoring</p>
              </div>
            )}

            {isSharing && (
              <div className={`sm-status-overlay sm-status-${scanStatus}`}>
                <span className="sm-status-dot" />
                {statusLabel}
                {frameCount > 0 && (
                  <span className="sm-frame-count"> · {frameCount} frame{frameCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}
          </div>

          {errorMsg && <div className="empty-state" style={{ marginTop: '0.75rem' }}>{errorMsg}</div>}

          <div className="sm-controls">
            {!isSharing ? (
              <button
                type="button"
                className="analysis-submit"
                onClick={startSharing}
              >
                <Monitor size={17} />
                Start screen sharing
              </button>
            ) : (
              <>
                {!isScanning ? (
                  <button
                    type="button"
                    className="analysis-submit"
                    onClick={startScanning}
                  >
                    <Activity size={17} />
                    Start monitoring
                  </button>
                ) : (
                  <button
                    type="button"
                    className="analysis-submit sm-stop-btn"
                    onClick={stopScanning}
                  >
                    <MicOff size={17} />
                    Pause monitoring
                  </button>
                )}
                <button
                  type="button"
                  className="workspace-btn workspace-btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                  onClick={stopSharing}
                >
                  <MonitorOff size={15} />
                  Stop sharing
                </button>
              </>
            )}
          </div>

          <div className="sm-voice-row">
            <button
              type="button"
              className={`analysis-channel-button${voiceEnabled ? ' active' : ''}`}
              onClick={() => {
                setVoiceEnabled((enabled) => {
                  const next = !enabled;
                  if (!next) {
                    window.speechSynthesis?.cancel();
                  } else {
                    primeSpeech(true);
                  }
                  return next;
                });
              }}
            >
              {voiceEnabled ? <Mic size={14} /> : <MicOff size={14} />}
              {voiceEnabled ? 'Voice alerts on' : 'Voice alerts off'}
            </button>
          </div>
        </article>

        <article className="sm-results-panel analysis-result-panel">
          <div className="analysis-result-header" style={{ marginBottom: '0.85rem' }}>
            <div>
              <h3>Detection feed</h3>
              <p className="workspace-muted">Real-time verdicts appear here as each frame is analyzed.</p>
            </div>
            {log.length > 0 && (
              <button
                type="button"
                className="workspace-btn workspace-btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                onClick={clearLog}
              >
                Clear
              </button>
            )}
          </div>

          {latestResult && (
            <div className={`sm-hero-card sm-hero-${latestResult.riskLevel.toLowerCase()}`}>
              <div className="analysis-result-header">
                <strong>{latestResult.threatType}</strong>
                <span className={riskClassName(latestResult.riskLevel)}>{latestResult.riskLevel}</span>
              </div>
              <div className="analysis-score-grid" style={{ marginTop: '0.6rem' }}>
                <div>
                  <span className="workspace-muted">Risk score</span>
                  <strong>{latestResult.riskScore}</strong>
                </div>
                <div>
                  <span className="workspace-muted">Time</span>
                  <strong>{latestResult.ts}</strong>
                </div>
              </div>
              <div className="analysis-meter-track" style={{ marginTop: '0.55rem' }}>
                <div className="analysis-meter-fill" style={{ width: `${Math.max(8, latestResult.riskScore)}%` }} />
              </div>
              <p style={{ marginTop: '0.6rem', fontSize: '0.89rem', lineHeight: '1.55', color: 'rgba(245,245,247,0.88)' }}>
                {latestResult.explanation}
              </p>
              {latestResult.recommendation && (
                <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.84rem', color: 'rgba(245,245,247,0.7)' }}>
                  <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  {latestResult.recommendation}
                </div>
              )}
            </div>
          )}

          {log.length > 0 ? (
            <div className="sm-log">
              {log.map((entry, index) => (
                <div key={index} className={`sm-log-row sm-log-${entry.riskLevel.toLowerCase()}`}>
                  <div className="sm-log-meta">
                    <span className="sm-log-time">{entry.ts}</span>
                    <span className={riskClassName(entry.riskLevel)}>{entry.riskLevel}</span>
                  </div>
                  <div className="sm-log-body">
                    <strong>{entry.threatType}</strong>
                    <span> · score {entry.riskScore}</span>
                  </div>
                  <p className="sm-log-explanation">{entry.explanation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="result-placeholder" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={16} />
              Start monitoring to populate the detection feed.
            </div>
          )}
        </article>
      </section>
    </div>
  );
};

export default ScreenMonitor;
