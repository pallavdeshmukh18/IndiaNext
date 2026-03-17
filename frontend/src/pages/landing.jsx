import React from 'react';
import Hero from '../components/Hero';
import GraphicsSection from '../components/GraphicsSection';
import { motion } from 'framer-motion';
import { ArrowRight, ScanSearch, ShieldCheck, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const overviewStats = [
  { value: '4+', label: 'Supported Channels (Web, Ext, Bots)' },
  { value: 'XAI', label: 'Explainable Reasoning Engine' },
  { value: 'OCR', label: 'Screenshot Threat Detection' },
];

const overviewNotes = [
  'Analyst-readable verdicts instead of opaque scores',
  'Private-by-default capture before any route leaves the device',
  'One handoff from suspicious input to documented response action'
];

const workflowHighlights = [
  'Inputs are sealed before external processing begins',
  'Routing fragments origin and session context',
  'Classification, evidence, and next-step guidance remain attached'
];

const protocolSteps = [
  {
    id: '01',
    title: 'Multi-Channel Submission',
    description: 'Users submit suspicious emails, URLs, text, or screenshots via Web, Chrome Extension, Telegram, or WhatsApp.',
  },
  {
    id: '02',
    title: 'ML Threat Analysis & OCR',
    description: 'Python ML microservice analyzes keywords, domains, and urgency. OCR extracts text from image-based scams.',
  },
  {
    id: '03',
    title: 'Explainable Verdict',
    description: 'System generates a human-readable explanation of why a threat was flagged and its associated confidence score.',
  },
  {
    id: '04',
    title: 'Risk Scoring & Mitigation',
    description: 'Threat gets assigned a severity (High/Med/Low) alongside practical recommended actions for the user.',
  },
];

const threatSignals = [
  {
    id: 'T01',
    label: 'Phishing Emails',
    surface: 'GMAIL / OUTLOOK',
    value: 'Detects urgency language, suspicious domain patterns, and embedded malicious links directly in the browser.',
    note: 'Evaluated pre-click.',
    icon: ShieldCheck,
  },
  {
    id: 'T02',
    label: 'Malicious URLs',
    surface: 'BROWSER / CHAT',
    value: 'Analyzes routing and domain reputation before the user visits the destination.',
    note: 'Blocks zero-day domains.',
    icon: Waypoints,
  },
  {
    id: 'T03',
    label: 'Prompt Injection',
    surface: 'AI ASSISTANTS',
    value: 'Identifies manipulation attempts and malicious instructions aimed at overriding system prompts.',
    note: 'Secures LLM inputs.',
    icon: ScanSearch,
  },
  {
    id: 'T04',
    label: 'Deceptive Screenshots',
    surface: 'MESSAGING BOTS',
    value: 'OCR pipeline extracts and analyzes text from images forwarded to WhatsApp or Telegram bots.',
    note: 'Catches image-based scams.',
    icon: ScanSearch,
  },
];

const explainabilityPoints = [
  'Why the threat was flagged (e.g., "urgency language detected").',
  'How confident the system is in its prediction (0-100%).',
  'What exact evidence was used (suspicious domains, keywords).',
  'What action should be taken next (e.g., verify sender identity).',
];

const consoleMetrics = [
  { label: 'High Risk', value: '14' },
  { label: 'Med Risk', value: '42' },
  { label: 'Low Risk', value: '189' },
];

const activityRows = [
  { incident: 'Phishing Attempt', channel: 'Gmail Extension', confidence: '92%', status: 'Escalated' },
  { incident: 'Suspicious Link', channel: 'WhatsApp Bot', confidence: '88%', status: 'Blocked' },
  { incident: 'Prompt Manipulation', channel: 'Web Dashboard', confidence: '75%', status: 'Reviewing' },
  { incident: 'Deceptive Screenshot', channel: 'Telegram Bot', confidence: '95%', status: 'Contained' },
];

const docsItems = [
  'Deployment notes for routing, auth, and scan orchestration',
  'Readable model outputs that support audit trails and analyst review',
  'Product surfaces designed to move from detection into response without rework'
];

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: 'easeOut' }
};

function WireGlobe() {
  return (
    <svg
      className="landing-globe-graphic"
      viewBox="0 0 640 640"
      role="img"
      aria-label="Wireframe globe illustration"
    >
      <defs>
        <linearGradient id="globeFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="65%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>

      <g fill="none" stroke="url(#globeFade)" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="292" cy="302" r="230" />
        <ellipse cx="292" cy="302" rx="230" ry="86" />
        <ellipse cx="292" cy="302" rx="230" ry="148" />
        <ellipse cx="292" cy="302" rx="196" ry="230" transform="rotate(-18 292 302)" />
        <ellipse cx="292" cy="302" rx="132" ry="230" transform="rotate(-18 292 302)" />
        <ellipse cx="292" cy="302" rx="68" ry="230" transform="rotate(-18 292 302)" />
        <path d="M122 270c26-18 54-34 92-32 34 2 58 18 84 18 22 0 42-10 58-20 18-12 34-22 58-22 26 0 42 8 60 16" />
        <path d="M106 336c32-10 52 8 88 8 40 0 58-18 92-18 34 0 54 12 84 12 28 0 58-10 94-24" />
        <path d="M164 210c-26 8-48 34-56 68 10 16 24 20 40 14 20-8 14-38 36-50 18-10 48 6 64-16 10-14 8-34-6-54" />
        <path d="M252 158c12 10 24 30 22 54-2 18-14 26-14 44 0 18 16 36 34 34 20-2 28-28 48-28 14 0 30 10 44 8 16-4 22-20 20-40" />
        <path d="M410 194c30 12 46 34 54 60 4 18-8 34-24 34-22 0-34-18-56-16-20 0-36 16-48 32-14 18-30 38-54 44" />
        <path d="M152 392c24-6 42 4 52 22 12 20 10 48 30 60" />
        <path d="M392 380c18 10 34 30 34 52 0 22-16 36-34 48" />
      </g>
    </svg>
  );
}

function EyeGraphic() {
  return (
    <svg
      className="landing-eye-graphic"
      viewBox="0 0 720 360"
      role="img"
      aria-label="Abstract eye surveillance illustration"
    >
      <defs>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="irisGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#f5f5f7" />
          <stop offset="30%" stopColor="#8e94ad" />
          <stop offset="70%" stopColor="#1d1e28" />
          <stop offset="100%" stopColor="#060608" />
        </radialGradient>
      </defs>

      <rect width="720" height="360" fill="transparent" />
      <ellipse cx="460" cy="188" rx="210" ry="122" fill="url(#eyeGlow)" />
      <path
        d="M164 182c74-76 154-114 246-114 96 0 174 38 252 114-78 74-156 112-252 112-92 0-170-38-246-112Z"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
      />
      <ellipse cx="458" cy="182" rx="112" ry="92" fill="url(#irisGlow)" />
      <circle cx="458" cy="182" r="50" fill="#030304" />
      <circle cx="438" cy="164" r="14" fill="rgba(255,255,255,0.78)" />
      <circle cx="458" cy="182" r="26" fill="none" stroke="rgba(255,255,255,0.62)" strokeDasharray="5 6" strokeWidth="2" />
      <circle cx="458" cy="182" r="88" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <path d="M144 182h80" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M542 182h86" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="5 6" />
    </svg>
  );
}

const Landing = () => {
  return (
    <>
      <Hero />
      <GraphicsSection />

      <div className="landing-bespoke">
        <motion.section className="section-hero-bridge" {...reveal}>
            <div className="bridge-content">
                <h2 className="stark-heading">
                    A calmer front-end for <br/>
                    <span className="text-muted">high-stakes threat decisions.</span>
                </h2>
                <p className="bridge-copy">
                  The product surface behaves like a real launch site: concise framing,
                  clear evidence of system behavior, and a direct path to the console.
                </p>
                <div className="bridge-stats">
                   {overviewStats.map((item) => (
                      <div key={item.label} className="raw-stat">
                        <span className="raw-value">{item.value}</span>
                        <span className="raw-label">{item.label}</span>
                      </div>
                    ))}
                </div>
            </div>
        </motion.section>

        <motion.section className="section-asymmetric-flow" id="how-it-works" {...reveal}>
            <div className="flow-visual-zone">
                <div className="mesh-globe-wrapper">
                    <WireGlobe />
                    <div className="raw-status-indicator">
                        <span className="blinking-square"></span>
                        Route Active
                    </div>
                </div>
            </div>
            
            <div className="flow-text-zone">
              <h2 className="stark-heading">Traffic enters sealed,<br/>leaves classified.</h2>
              <p className="heavy-copy">
                Krypton reduces what an attacker can infer by sealing local context first, fragmenting routes second,
                and attaching explainable verdicts before the analyst ever touches the case.
              </p>
              
              <div className="raw-timeline">
                {protocolSteps.map((step) => (
                  <div key={step.id} className="raw-step">
                    <div className="raw-step-num">{step.id}</div>
                    <div className="raw-step-detail">
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </motion.section>

        <motion.section className="section-monolithic-grid" id="threat-detection" {...reveal}>
            <div className="monolith-header">
                <h2 className="stark-heading">Coverage that feels productized,<br/><span className="text-muted">not hypothetical.</span></h2>
            </div>

            <div className="monolith-card-grid">
              {threatSignals.map(({ id, label, surface, value, note, icon: Icon }) => (
                <div key={label} className="monolith-card">
                   <div className="monolith-card-top">
                      <Icon size={24} className="monolith-icon" />
                      <span className="monolith-surface">{surface}</span>
                   </div>
                   <h3>{label}</h3>
                   <p className="monolith-value">{value}</p>
                   <div className="monolith-card-bottom">
                       <span>{note}</span>
                   </div>
                </div>
              ))}
            </div>
        </motion.section>

        <motion.section className="section-asymmetric-explainable" id="explainable-ai" {...reveal}>
             <div className="explainable-text-zone">
                <h2 className="stark-heading">Reasoning stays visible,<br/>even when response is fast.</h2>
                <div className="raw-list">
                  {explainabilityPoints.map((item) => (
                    <div key={item} className="raw-list-item">
                      <div className="bullet-square"></div>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
                <div className="raw-action">
                  <Link to="/login" className="btn-stark">
                    Open console <ArrowRight size={16} />
                  </Link>
                </div>
            </div>
            
            <div className="explainable-visual-zone">
                <div className="stark-graphic-container">
                   <EyeGraphic />
                   <div className="stark-caption">
                       Context, indicators, and next action stay in frame.
                   </div>
                </div>
            </div>
        </motion.section>

        <motion.section className="section-terminal-preview" id="dashboard" {...reveal}>
            <div className="terminal-header">
                <h2 className="stark-heading">One surface for triage,<br/>telemetry, and response.</h2>
            </div>

            <div className="raw-terminal-window">
               <div className="terminal-top-bar">
                   <span className="terminal-title">INCIDENT_QUEUE_LIVE</span>
               </div>
               
               <div className="terminal-metrics">
                 {consoleMetrics.map((item) => (
                    <div key={item.label} className="t-metric">
                      <span className="t-label">{item.label}</span>
                      <span className="t-value">{item.value}</span>
                    </div>
                  ))}
               </div>

               <div className="terminal-table-container">
                 <table className="stark-table">
                   <thead>
                     <tr>
                       <th>Incident</th>
                       <th>Channel</th>
                       <th>Confidence</th>
                       <th>Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {activityRows.map((row) => (
                        <tr key={row.incident}>
                          <td className="t-cell-strong">{row.incident}</td>
                          <td className="t-cell-muted">{row.channel}</td>
                          <td className="t-cell-mono">{row.confidence}</td>
                          <td>
                             <span className={`raw-status-text status-${row.status.toLowerCase()}`}>
                               [{row.status.toUpperCase()}]
                             </span>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
               </div>
            </div>
        </motion.section>
        
        <motion.section className="section-final-monolith" {...reveal}>
            <div className="monolith-content">
                <h2 className="stark-heading giant">Ready to move<br/>from edge to core?</h2>
                <div className="monolith-actions">
                    <Link to="/signup" className="btn-stark giant-btn">
                      Create account
                    </Link>
                    <Link to="/login" className="btn-stark-ghost giant-btn">
                      Sign in
                    </Link>
                </div>
            </div>
        </motion.section>
      </div>
    </>
  );
};

export default Landing;
