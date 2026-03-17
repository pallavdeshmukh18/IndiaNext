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
import './WorkspacePages.css';
import './ScreenMonitor.css';

const AI_PROVIDERS = [
  { key: 'gemini', label: 'Gemini 2.5 Flash', note: 'Google — best for realtime vision' },
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

Respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON:
{
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "riskScore": <integer 0-100>,
  "threatType": "<short threat label or 'No Threat Detected'>",
  "explanation": "<1-2 sentences max — will be read aloud>",
  "recommendation": "<one concrete action>"
}

If the screen appears safe, set riskLevel to LOW and riskScore below 15.`;

const STORAGE_KEY_API = 'sm.apiKey';
const STORAGE_KEY_PROVIDER = 'sm.provider';
const ENV_GEMINI_API_KEY = String(import.meta.env.GEMINI_API_KEY || '').trim();
const AI_REQUEST_TIMEOUT_MS = 15000;

async function callGemini(apiKey, base64Jpeg) {
  let lastError = null;

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }
          ]}],
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
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  throw lastError || new Error('No Gemini model returned a valid response.');
}

async function callOpenAI(apiKey, base64Jpeg) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Jpeg}`, detail: 'low' } }] }
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
  return JSON.parse(data.choices[0].message.content);
}

async function callGrok(apiKey, base64Jpeg) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'grok-2-vision-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Jpeg}`, detail: 'low' } }] }
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
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function analyzeWithAI(provider, apiKey, base64Jpeg) {
  if (provider === 'openai') return callOpenAI(apiKey, base64Jpeg);
  if (provider === 'grok') return callGrok(apiKey, base64Jpeg);
  return callGemini(apiKey, base64Jpeg);
}

async function analyzeWithTimeout(provider, apiKey, base64Jpeg, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
  return Promise.race([
    analyzeWithAI(provider, apiKey, base64Jpeg),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI request timed out after ${Math.round(timeoutMs / 1000)}s. Check API key, quota, or network.`));
      }, timeoutMs);
    })
  ]);
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

function captureFrame(videoEl, scale = 0.4) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(videoEl.videoWidth * scale);
  canvas.height = Math.round(videoEl.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  // Returns base64 without the data URI prefix
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
}

function speak(text, voiceEnabled) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') return;
  const synth = window.speechSynthesis;
  synth.resume();
  if (synth.speaking || synth.pending) {
    synth.cancel();
  }
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

  const [isSharing, setIsSharing] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [showSettings, setShowSettings] = React.useState(true);
  const [interval, setIntervalMs] = React.useState(5000);
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(STORAGE_KEY_API) || ENV_GEMINI_API_KEY || '');
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [aiProvider, setAiProvider] = React.useState(() => localStorage.getItem(STORAGE_KEY_PROVIDER) || 'gemini');
  const [log, setLog] = React.useState([]);
  const [latestResult, setLatestResult] = React.useState(null);
  const [scanStatus, setScanStatus] = React.useState('idle'); // idle | scanning | suspicious | safe
  const [errorMsg, setErrorMsg] = React.useState('');
  const [frameCount, setFrameCount] = React.useState(0);

  // Keep ref in sync so the interval callback always reads fresh values
  React.useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  const appendLog = React.useCallback((entry) => {
    setLog((prev) => [entry, ...prev].slice(0, MAX_LOG));
  }, []);

  const stopSharing = React.useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    window.speechSynthesis?.cancel();
    setIsSharing(false);
    setIsScanning(false);
    setScanStatus('idle');
  }, []);

  const runScan = React.useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    setScanStatus('scanning');
    setFrameCount((n) => n + 1);

    let base64;
    try {
      base64 = captureFrame(videoRef.current);
    } catch {
      return;
    }

    if (!apiKey.trim()) {
      setScanStatus('idle');
      setErrorMsg('Enter an API key in Settings before monitoring.');
      speak('API key missing. Please set GEMINI API key in settings.', voiceEnabled);
      return;
    }

    try {
      const parsed = await analyzeWithTimeout(aiProvider, apiKey.trim(), base64);

      const rawRiskScore = Number(parsed?.riskScore);
      const riskLevelFromModel = String(parsed?.riskLevel || '').trim().toUpperCase();
      const normalizedRiskLevel = ['HIGH', 'MEDIUM', 'LOW'].includes(riskLevelFromModel)
        ? riskLevelFromModel
        : null;
      const riskScore = Number.isFinite(rawRiskScore)
        ? Math.max(0, Math.min(100, Math.round(rawRiskScore)))
        : normalizedRiskLevel === 'HIGH'
          ? 85
          : normalizedRiskLevel === 'MEDIUM'
            ? 55
            : 10;
      const riskLevel = normalizedRiskLevel || (riskScore >= 75 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW');
      const threatType = parsed.threatType || 'No Threat Detected';
      const explanation = parsed.explanation || 'Screen appears clean.';
      const recommendation = parsed.recommendation || '';
      const ts = new Date().toLocaleTimeString();

      const entry = { ts, riskScore, riskLevel, threatType, explanation, recommendation };
      setLatestResult(entry);
      appendLog(entry);
      setErrorMsg('');

      const isSuspicious = riskLevel === 'HIGH' || riskLevel === 'MEDIUM' || riskScore >= 40;
      setScanStatus(isSuspicious ? 'suspicious' : 'safe');

      if (isSuspicious) {
        speak(`Security alert. ${riskLevel} risk. ${explanation} ${recommendation}`, voiceEnabled);
      } else if (voiceEnabled && riskScore < 15) {
        speak('Screen looks safe.', voiceEnabled);
      }
    } catch (err) {
      setScanStatus('safe');
      setErrorMsg(`AI error: ${err.message}`);
      speak(`AI monitoring error. ${err.message}`, voiceEnabled);
      appendLog({
        ts: new Date().toLocaleTimeString(),
        riskScore: 0,
        riskLevel: 'LOW',
        threatType: 'API error',
        explanation: err.message,
        recommendation: 'Check your API key and provider in Settings.'
      });
    }
  }, [apiKey, aiProvider, voiceEnabled, appendLog]);

  const startScanning = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setErrorMsg('Speech is not supported in this browser. Use Chrome or Edge and allow sound.');
    }
    primeSpeech(voiceEnabled);
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
  }, []);

  const startSharing = React.useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // If the user stops sharing via the browser UI
      stream.getVideoTracks()[0].addEventListener('ended', stopSharing);

      setIsSharing(true);
      setFrameCount(0);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setErrorMsg('Could not start screen capture. Your browser may not support this feature.');
      }
    }
  }, [stopSharing]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  const statusLabel = {
    idle: 'Idle',
    scanning: 'Scanning…',
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
            Share your screen — the AI will capture frames at regular intervals, analyze them for threats, and
            immediately speak any suspicious findings aloud.
          </p>
        </div>
        <div className="workspace-page-hero-actions">
          <button
            type="button"
            className="workspace-btn workspace-btn-secondary"
            onClick={() => setShowSettings((s) => !s)}
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
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`analysis-channel-button${aiProvider === p.key ? ' active' : ''}`}
                    onClick={() => {
                      setAiProvider(p.key);
                      localStorage.setItem(STORAGE_KEY_PROVIDER, p.key);
                    }}
                  >
                    {p.label}
                    <span className="sm-provider-note">{p.note}</span>
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
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem(STORAGE_KEY_API, e.target.value);
                  }}
                  placeholder={`Paste your ${AI_PROVIDERS.find((p) => p.key === aiProvider)?.label} API key`}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="analysis-channel-button"
                  style={{ flexShrink: 0 }}
                  onClick={() => setShowApiKey(v => !v)}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="analysis-helper" style={{ marginTop: '0.35rem' }}>
                Auto-loads from <strong>frontend/.env</strong> key <strong>GEMINI_API_KEY</strong>. Any value entered here overrides and is saved to localStorage.
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
                    setVoiceEnabled((v) => {
                      const next = !v;
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
        {/* Left: preview + controls */}
        <article className="sm-preview-panel analysis-form-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Screen preview</h3>
              <p>Frames are captured locally and sent directly from your browser to the AI — your backend is not involved.</p>
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
                setVoiceEnabled((v) => {
                  const next = !v;
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

        {/* Right: results panel */}
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

          {/* Latest result hero card */}
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

          {/* Scrollable log */}
          {log.length > 0 ? (
            <div className="sm-log">
              {log.map((entry, i) => (
                <div key={i} className={`sm-log-row sm-log-${entry.riskLevel.toLowerCase()}`}>
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
