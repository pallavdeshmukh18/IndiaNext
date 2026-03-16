import React from 'react';
import Hero from '../components/Hero';
import GraphicsSection from '../components/GraphicsSection';
import { motion } from 'framer-motion';
import { ArrowRight, ScanSearch, ShieldCheck, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const overviewStats = [
  { value: '05', label: 'Protected channels' },
  { value: '24/7', label: 'Continuous verdict loop' },
  { value: '<120ms', label: 'Typical response path' }
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
    title: 'Input and local encryption',
    description:
      'Before payloads leave the device, the signal is normalized and sealed so raw user context stays private.'
  },
  {
    id: '02',
    title: 'Identity dissolve via mesh routing',
    description:
      'Sessions are fragmented across adaptive routes so no single path can be traced back to the origin.'
  },
  {
    id: '03',
    title: 'Threat filtering and behavioral scoring',
    description:
      'Classifier layers inspect tone, links, prompts, and anomalies before a case ever reaches the user queue.'
  },
  {
    id: '04',
    title: 'Destination delivery',
    description:
      'Only the clean response moves forward, with verdicts, rationale, and response guidance attached.'
  }
];

const threatSignals = [
  {
    id: '01',
    label: 'Email infiltration',
    surface: 'Mail pipeline',
    value: 'Spear-phishing, invoice fraud, impersonation trails',
    note: 'Headers, content, and intent analyzed together',
    icon: ScanSearch
  },
  {
    id: '02',
    label: 'Prompt defense',
    surface: 'LLM interface',
    value: 'Instruction override, jailbreak patterns, extraction attempts',
    note: 'Useful when LLM-facing interfaces need hardening',
    icon: ShieldCheck
  },
  {
    id: '03',
    label: 'Session routing',
    surface: 'Traffic control',
    value: 'Adaptive pathing, local sealing, analyst-grade telemetry',
    note: 'Built to keep source context quiet while decisions move fast',
    icon: Waypoints
  }
];

const explainabilityPoints = [
  'Each verdict includes indicators, confidence, and why the model escalated.',
  'Operators get a next step, not just a score.',
  'Archived detections stay searchable with source context preserved.'
];

const consoleMetrics = [
  { label: 'High risk', value: '14' },
  { label: 'Medium', value: '29' },
  { label: 'Low', value: '108' }
];

const activityRows = [
  { incident: 'Invoice phishing attempt', channel: 'Mail', confidence: '96%', status: 'Escalated' },
  { incident: 'Prompt extraction sequence', channel: 'Prompt', confidence: '91%', status: 'Contained' },
  { incident: 'Credential lure landing page', channel: 'URL', confidence: '94%', status: 'Blocked' },
  { incident: 'Spoofed support message', channel: 'Chat', confidence: '88%', status: 'Reviewing' }
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

      <div className="landing-page">
        <motion.section className="landing-overview-band" {...reveal}>
          <div className="landing-overview-copy">
            <p className="landing-panel-label">DEPLOYED SIGNAL LAYER</p>
            <h2>A calmer front-end for high-stakes threat decisions.</h2>
            <p className="landing-panel-copy">
              The product surface below the hero now behaves like a real launch site: concise product framing,
              clearer evidence of what the system does, and a path from curiosity to console access.
            </p>
          </div>

          <div className="landing-overview-meta">
            <div className="landing-stat-grid">
              {overviewStats.map((item) => (
                <div key={item.label} className="landing-stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="landing-note-list">
              {overviewNotes.map((note) => (
                <div key={note} className="landing-note-item">
                  <span className="landing-note-dot" />
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <section className="landing-system-grid" id="how-it-works">
          <motion.article className="landing-panel landing-globe-panel" {...reveal}>
            <div className="landing-panel-header">
              <p className="landing-panel-label">SYSTEM FLOW</p>
              <span className="landing-panel-code">01</span>
            </div>

            <h2>Traffic enters sealed, leaves classified.</h2>
            <p className="landing-panel-copy">
              Krypton reduces what an attacker can infer by sealing local context first, fragmenting routes second,
              and attaching explainable verdicts before the analyst ever touches the case.
            </p>

            <div className="landing-bullet-list">
              {workflowHighlights.map((item) => (
                <div key={item} className="landing-bullet-item">
                  <span className="landing-note-dot" />
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="landing-globe-stage">
              <WireGlobe />
              <div className="landing-panel-chip">Mesh route active</div>
            </div>
          </motion.article>

          <motion.aside className="landing-panel landing-protocol-panel" {...reveal}>
            <div className="landing-aside-intro">
              <p className="landing-panel-label">PROTOCOL</p>
              <p>Each step keeps the signal useful to operators and quieter to everyone else.</p>
            </div>

            {protocolSteps.map((step) => (
              <div key={step.id} className="landing-protocol-step">
                <span className="landing-step-id">{step.id}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </motion.aside>
        </section>

        <motion.section className="landing-threat-row" id="threat-detection" {...reveal}>
          <div className="landing-row-header">
            <div>
              <p className="landing-panel-label">THREAT DETECTION</p>
              <h2>Coverage that feels productized, not hypothetical.</h2>
            </div>
            <span>Behavioral filtering across the channels users actually touch.</span>
          </div>

          <div className="landing-threat-grid">
            {threatSignals.map(({ id, label, surface, value, note, icon: Icon }, index) => (
              <article key={label} className={`landing-threat-card${index === 0 ? ' is-featured' : ''}`}>
                <div className="landing-threat-meta">
                  <span className="landing-threat-index">{id}</span>
                  <span className="landing-threat-surface">{surface}</span>
                </div>
                <span className="landing-threat-icon">
                  <Icon size={18} />
                </span>
                <strong>{label}</strong>
                <p>{value}</p>
                <span className="landing-threat-note">{note}</span>
              </article>
            ))}
          </div>
        </motion.section>

        <section className="landing-split-panel" id="explainable-ai">
          <motion.article className="landing-panel landing-cta-panel" {...reveal}>
            <p className="landing-panel-label">EXPLAINABLE AI</p>
            <h2>Reasoning stays visible, even when response is fast.</h2>
            <p className="landing-panel-copy">
              The interface keeps confidence, indicators, and operator guidance close together so decisions feel
              reviewable instead of improvised.
            </p>

            <div className="landing-principle-list">
              {explainabilityPoints.map((item) => (
                <div key={item} className="landing-principle-item">
                  <span className="landing-note-dot" />
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="landing-hero-actions">
              <Link to="/login" className="landing-button landing-button-primary">
                Open console <ArrowRight size={15} />
              </Link>
              <a href="#docs" className="landing-button landing-button-secondary">
                Review notes
              </a>
            </div>
          </motion.article>

          <motion.article className="landing-panel landing-eye-panel" {...reveal}>
            <EyeGraphic />
            <div className="landing-eye-caption">
              <span className="landing-panel-label">ANALYST VIEW</span>
              <strong>Context, indicators, and next action stay in frame.</strong>
            </div>
          </motion.article>
        </section>

        <section className="landing-console-grid" id="dashboard">
          <motion.article className="landing-panel landing-console-panel" {...reveal}>
            <div className="landing-panel-header">
              <p className="landing-panel-label">CONSOLE PREVIEW</p>
              <span className="landing-panel-code">LIVE</span>
            </div>

            <h2>One surface for triage, telemetry, and response.</h2>

            <div className="landing-console-metrics">
              {consoleMetrics.map((item) => (
                <div key={item.label} className="landing-console-metric">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="landing-console-table">
              <div className="landing-console-head">
                <span>Incident</span>
                <span>Channel</span>
                <span>Confidence</span>
                <span>Status</span>
              </div>

              {activityRows.map((row) => (
                <div key={row.incident} className="landing-console-row">
                  <strong>{row.incident}</strong>
                  <span>{row.channel}</span>
                  <span>{row.confidence}</span>
                  <span className={`landing-console-status ${row.status.toLowerCase()}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </motion.article>

          <div className="landing-side-stack">
            <motion.article className="landing-panel landing-docs-panel" id="docs" {...reveal}>
              <div className="landing-panel-header">
                <p className="landing-panel-label">DOCS</p>
                <span className="landing-panel-code">NOTES</span>
              </div>

              <div className="landing-docs-copy">
                <h2>Documentation that feels maintained.</h2>
                <p>
                  Clear product notes matter because real operators need to understand how routing, scoring, and
                  escalation behave before they trust the result.
                </p>
              </div>

              <div className="landing-docs-list">
                {docsItems.map((item) => (
                  <div key={item} className="landing-docs-item">
                    <span className="landing-note-dot" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </motion.article>

            <motion.article className="landing-panel landing-deploy-panel" {...reveal}>
              <p className="landing-panel-label">READY TO LAUNCH</p>
              <h3>Move from the public site into the product without a design cliff.</h3>
              <p>
                The landing page and authenticated workspace now share the same restraint, typography, and operating
                tone, which makes the transition feel deliberate.
              </p>

              <div className="landing-hero-actions">
                <Link to="/signup" className="landing-button landing-button-primary">
                  Create account
                </Link>
                <Link to="/login" className="landing-button landing-button-secondary">
                  Sign in
                </Link>
              </div>
            </motion.article>
          </div>
        </section>
      </div>
    </>
  );
};

export default Landing;
