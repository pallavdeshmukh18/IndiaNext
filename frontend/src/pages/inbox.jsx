import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  MoreVertical,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { formatRelativeTime } from '../lib/mockData';
import './WorkspacePages.css';
import './Inbox.css'; // We will create this next for inbox-specific tweaks

// Simulated Inbox Data
const mockEmails = [
  {
    id: 'msg-01',
    senderName: 'Microsoft 365 Support',
    senderEmail: 'noreply@m365-security-update.net',
    subject: 'Action Required: Your Mailbox Quota Exceeded',
    date: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    preview: 'Your mailbox has reached 98% capacity. Please verify your account to...',
    body: `Dear User,\n\nYour mailbox has reached 98% of its allocated capacity. To prevent incoming emails from bouncing, you must verify your account immediately and request a quota increase.\n\nPlease log in to the secure portal below to continue:\n\nhttps://m365-security-update.net/verify-quota\n\nFailure to act within 24 hours will result in temporary suspension of mailbox services.\n\nRegards,\nThe Microsoft 365 Team`,
    threatType: 'Phishing Payload',
    riskScore: 94,
    riskLevel: 'HIGH',
    explanation: 'Highly deceptive payload using structural urgency, account suspension threats, and a closely spoofed Microsoft domain link.',
    indicators: ['Urgency language detected', 'Credential request pattern', 'Domain spoofing cues']
  },
  {
    id: 'msg-02',
    senderName: 'Sarah Jenkins (Finance)',
    senderEmail: 's.jenkins@company-internal.com',
    subject: 'Q3 Budget Review Updates',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    preview: 'Hi team, please find attached the revised Q3 budget projections. Let...',
    body: `Hi team,\n\nPlease find attached the revised Q3 budget projections following yesterday's all-hands meeting. Let me know if you see any discrepancies in the departmental allocations before we finalize this with the executive board on Thursday.\n\nThanks,\nSarah`,
    threatType: 'Benign Activity',
    riskScore: 12,
    riskLevel: 'LOW',
    explanation: 'Standard internal communication pattern. No malicious links, missing attachments, or suspicious behavioral requests detected.',
    indicators: []
  },
  {
    id: 'msg-03',
    senderName: 'IT Helpdesk',
    senderEmail: 'helpdesk@company.com',
    subject: 'SECURITY ALERT: New Login from Unknown Device',
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    preview: 'We detected a new login to your corporate account from an unfamiliar...',
    body: `We detected a new login to your corporate account from an unfamiliar device in Moscow, Russia.\n\nIf this was not you, please secure your account by resetting your password immediately using the link below:\n\nhttps://company-it-support-portal.info/reset\n\nIf you ignore this message, your account will be locked for security purposes.`,
    threatType: 'Credential Harvester',
    riskScore: 88,
    riskLevel: 'HIGH',
    explanation: 'Classic credential harvesting technique combining fear (unauthorized foreign login) with an illegitimate support domain.',
    indicators: ['Urgency language detected', 'External link present', 'Domain spoofing cues']
  },
  {
    id: 'msg-04',
    senderName: 'Dropbox Notification',
    senderEmail: 'no-reply@dropbox-transfer-alerts.com',
    subject: 'Alex shared "Confidential_M&A_Docs.zip" with you',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    preview: 'Alex shared a highly confidential file with you via Dropbox Transfer...',
    body: `Alex shared a highly confidential file with you via Dropbox Transfer.\n\nFile Name: Confidential_M&A_Docs.zip\nSize: 42.5 MB\n\nClick here to view and download the secure file:\nhttps://dropbox-transfer-alerts.com/view/a8f93j\n\nNote: You will be required to enter your corporate email password to verify your identity before downloading.`,
    threatType: 'Deceptive Content',
    riskScore: 76,
    riskLevel: 'MEDIUM',
    explanation: 'Attempts to steal corporate credentials by gating a fake file download behind a spoofed Dropbox page.',
    indicators: ['Credential request pattern', 'External link present']
  },
  {
    id: 'msg-05',
    senderName: 'GitHub Team',
    senderEmail: 'notifications@github.com',
    subject: '[GitHub] Run failed: deploy.yml in production',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    preview: 'The workflow deploy.yml failed in repository frontend-core-app...',
    body: `The workflow deploy.yml failed in repository frontend-core-app.\n\nCommit: "Fix navigation bug in sidebar"\nAuthor: Jason Bourne\n\nView the run details here:\nhttps://github.com/company/frontend-core-app/actions/runs/102934\n\nYou are receiving this because you are subscribed to this repository.`,
    threatType: 'Benign Activity',
    riskScore: 5,
    riskLevel: 'LOW',
    explanation: 'Legitimate automated notification from a recognized developer platform. Links and headers match known trusted patterns.',
    indicators: []
  }
];

function riskClassName(riskLevel) {
  return `risk-pill ${String(riskLevel || 'LOW').toLowerCase()}`;
}

const Inbox = () => {
  const [selectedEmail, setSelectedEmail] = React.useState(mockEmails[0]);

  return (
    <div className="workspace-page inbox-page">
      <section className="workspace-page-hero">
        <div className="workspace-page-hero-copy">
          <div className="workspace-data-badge live">Real-time Integration</div>
          <h2>Protected Inbox</h2>
          <p>
            Communicate safely. Every inbound message is analyzed by Krypton AI before you open it, highlighting risks and explaining verdicts directly in your workflow.
          </p>
        </div>
      </section>

      <section className="inbox-layout">
        <article className="workspace-panel inbox-list-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Message Queue</h3>
              <p>5 messages scanned today</p>
            </div>
            <Mail size={18} className="workspace-inline-icon" />
          </div>

          <div className="inbox-list">
            {mockEmails.map((email) => (
              <div 
                key={email.id}
                className={`inbox-list-item ${selectedEmail.id === email.id ? 'active' : ''}`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="inbox-item-header">
                  <span className="inbox-item-sender">{email.senderName}</span>
                  <span className="inbox-item-time">{formatRelativeTime(email.date)}</span>
                </div>
                <div className="inbox-item-subject">{email.subject}</div>
                <div className="inbox-item-preview">{email.preview}</div>
                <div className="inbox-item-footer">
                  <span className={riskClassName(email.riskLevel)}>
                    {email.riskLevel === 'HIGH' ? <AlertTriangle size={12}/> : null}
                    {email.riskLevel === 'MEDIUM' ? <Info size={12}/> : null}
                    {email.riskLevel === 'LOW' ? <CheckCircle2 size={12}/> : null}
                    {email.riskLevel}
                  </span>
                  <span className="inbox-item-score">Score: {email.riskScore}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="inbox-detail-container">
          {/* Top half: The Threat Analysis Panel */}
          {selectedEmail.riskLevel !== 'LOW' && (
            <article className="analysis-result-panel inbox-threat-panel">
              <div className="analysis-result-header">
                <div>
                  <h3>Threat Analysis</h3>
                  <p className="workspace-muted">Krypton AI detected potential risks in this message.</p>
                </div>
                <ShieldAlert size={18} className="workspace-inline-icon" style={{color: selectedEmail.riskLevel === 'HIGH' ? '#ff3b30' : '#ffcc00'}} />
              </div>

              <div className="analysis-score-card">
                <div className="analysis-result-header">
                  <strong>{selectedEmail.threatType}</strong>
                  <span className={riskClassName(selectedEmail.riskLevel)}>{selectedEmail.riskLevel} RISK</span>
                </div>

                <div className="analysis-score-grid">
                  <div>
                    <span className="workspace-muted">Risk score</span>
                    <strong>{selectedEmail.riskScore}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span className="workspace-muted">AI Explanation</span>
                    <strong style={{ fontSize: '0.85rem', fontWeight: 'normal', lineHeight: '1.4' }}>{selectedEmail.explanation}</strong>
                  </div>
                </div>

                <div className="analysis-meter-track">
                  <div className="analysis-meter-fill" style={{ width: `${Math.max(8, selectedEmail.riskScore)}%` }}></div>
                </div>
              </div>

              {selectedEmail.indicators.length > 0 && (
                 <div className="analysis-indicators" style={{ marginTop: '0.8rem' }}>
                 {selectedEmail.indicators.map((indicator) => (
                   <span key={indicator} className="analysis-indicator">
                     <Sparkles size={14} />
                     {indicator}
                   </span>
                 ))}
               </div>
              )}
            </article>
          )}

          {/* Bottom half: The Email Viewer */}
          <article className="workspace-panel inbox-viewer-panel">
            <div className="inbox-viewer-header">
              <div className="inbox-viewer-meta">
                <h2>{selectedEmail.subject}</h2>
                <div className="inbox-viewer-sender-info">
                  <div className="inbox-avatar">{selectedEmail.senderName.charAt(0)}</div>
                  <div className="inbox-sender-details">
                    <strong>{selectedEmail.senderName}</strong>
                    <span>&lt;{selectedEmail.senderEmail}&gt;</span>
                  </div>
                  <div className="inbox-viewer-time">
                    <Clock size={14} />
                    {new Date(selectedEmail.date).toLocaleString()}
                  </div>
                </div>
              </div>
              <button className="workspace-btn workspace-btn-secondary" style={{ padding: '0.4rem', border: 'none' }}>
                <MoreVertical size={18} />
              </button>
            </div>

            <div className="inbox-viewer-body">
              {/* Preserving line breaks via white-space: pre-wrap in CSS */}
              {selectedEmail.body}
            </div>

            <div className="inbox-viewer-actions">
               <button className="workspace-btn workspace-btn-primary">Reply</button>
               <button className="workspace-btn workspace-btn-secondary">Forward</button>
               {selectedEmail.riskLevel === 'HIGH' && (
                 <button className="workspace-btn" style={{ background: 'rgba(255,59,48,0.1)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.3)' }}>
                    Report as Malicious
                 </button>
               )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

export default Inbox;
