import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  MoreVertical,
  RefreshCcw,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { authApi, inboxApi } from '../lib/api';
import { formatRelativeTime } from '../lib/mockData';
import './WorkspacePages.css';
import './Inbox.css';

function riskClassName(riskLevel) {
  return `risk-pill ${String(riskLevel || 'LOW').toLowerCase()}`;
}

function splitSender(sender = '') {
  const match = sender.match(/^(.*?)(?:\s*<(.+)>)?$/);
  return {
    senderName: match?.[1]?.replace(/"/g, '').trim() || sender || 'Unknown sender',
    senderEmail: match?.[2]?.trim() || sender || 'Unknown sender'
  };
}

function formatEmailBody(body = '') {
  return String(body || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function normalizeEmail(email) {
  const { senderName, senderEmail } = splitSender(email.sender);
  const probability = Number(email.scamProbability || 0);
  const explanationList = Array.isArray(email.explanation) ? email.explanation.filter(Boolean) : [];
  const riskScore = Number(email.riskScore ?? probability * 100);

  return {
    id: email.id,
    senderName,
    senderEmail,
    subject: email.subject || '(No Subject)',
    date: email.sentAt || email.createdAt || new Date().toISOString(),
    preview: email.snippet || formatEmailBody(email.body).slice(0, 160) || 'No preview available.',
    body: formatEmailBody(email.body) || 'No email body available.',
    threatType: String(email.label || 'safe').replace(/^\w/, (character) => character.toUpperCase()),
    riskScore: Math.round(riskScore),
    riskLevel: email.riskLevel || 'LOW',
    explanation: explanationList.join(' ') || 'No explanation available.',
    indicators: explanationList,
    attachments: email.attachments || [],
    links: email.links || [],
    modelSource: email.modelSource || 'ML/phishing_mail/phishing_model.pkl',
    scoreBasis: email.scoreBasis || 'Risk score comes from the trained phishing model probability scaled to 0-100.'
  };
}

const Inbox = ({ session }) => {
  const [emails, setEmails] = React.useState([]);
  const [selectedEmailId, setSelectedEmailId] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const selectedEmail = React.useMemo(
    () => emails.find((email) => email.id === selectedEmailId) || emails[0] || null,
    [emails, selectedEmailId]
  );

  const loadInbox = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await inboxApi.getInboxScan(session?.userId);
      const nextEmails = (response?.results || []).map(normalizeEmail);
      setEmails(nextEmails);
      setSelectedEmailId((currentId) => currentId || nextEmails[0]?.id || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load inbox.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.userId]);

  React.useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleConnectGmail = React.useCallback(() => {
    window.location.href = authApi.getGoogleOAuthUrl();
  }, []);

  return (
    <div className="workspace-page inbox-page">
      <section className="workspace-page-hero">
        <div className="workspace-page-hero-copy">
          <div className="workspace-data-badge live">Real-time Integration</div>
          <h2>Protected Inbox</h2>
          <p>
            Scamurai scans the latest Gmail messages, scores phishing risk, and explains the verdict directly beside each message.
          </p>
        </div>
      </section>

      <section className="inbox-layout">
        <article className="workspace-panel inbox-list-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Message Queue</h3>
              <p>{isLoading ? 'Syncing Gmail...' : `${emails.length} messages scanned`}</p>
            </div>
            <div className="inbox-actions-inline">
              <button className="workspace-btn workspace-btn-secondary" type="button" onClick={loadInbox} disabled={isLoading}>
                <RefreshCcw size={16} />
                Refresh
              </button>
              <Mail size={18} className="workspace-inline-icon" />
            </div>
          </div>

          {error ? (
            <div className="inbox-empty-state">
              <ShieldAlert size={18} />
              <strong>Gmail access needed</strong>
              <p>{error}</p>
              <button type="button" className="workspace-btn workspace-btn-primary" onClick={handleConnectGmail}>
                Continue with Google
              </button>
            </div>
          ) : null}

          {!error && isLoading ? (
            <div className="inbox-empty-state">
              <Mail size={18} />
              <strong>Loading inbox</strong>
              <p>Fetching your latest Gmail messages and running scam analysis.</p>
            </div>
          ) : null}

          {!error && !isLoading && emails.length === 0 ? (
            <div className="inbox-empty-state">
              <Mail size={18} />
              <strong>No messages found</strong>
              <p>Connect Gmail and refresh to analyze the latest inbox messages.</p>
              <button type="button" className="workspace-btn workspace-btn-primary" onClick={handleConnectGmail}>
                Connect Gmail
              </button>
            </div>
          ) : null}

          {!error && !isLoading && emails.length > 0 ? (
            <div className="inbox-list">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={`inbox-list-item ${selectedEmail?.id === email.id ? 'active' : ''}`}
                  onClick={() => setSelectedEmailId(email.id)}
                >
                  <div className="inbox-item-header">
                    <span className="inbox-item-sender">{email.senderName}</span>
                    <span className="inbox-item-time">{formatRelativeTime(email.date)}</span>
                  </div>
                  <div className="inbox-item-subject">{email.subject}</div>
                  <div className="inbox-item-preview">{email.preview}</div>
                  <div className="inbox-item-footer">
                    <span className={riskClassName(email.riskLevel)}>
                      {email.riskLevel === 'HIGH' ? <AlertTriangle size={12} /> : null}
                      {email.riskLevel === 'MEDIUM' ? <Info size={12} /> : null}
                      {email.riskLevel === 'LOW' ? <CheckCircle2 size={12} /> : null}
                      {email.riskLevel}
                    </span>
                    <span className="inbox-item-score">Score: {email.riskScore}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <div className="inbox-detail-container">
          {selectedEmail ? (
            <>
              {selectedEmail.riskLevel !== 'LOW' && (
                <article className="analysis-result-panel inbox-threat-panel">
                  <div className="analysis-result-header">
                    <div>
                      <h3>Threat Analysis</h3>
                      <p className="workspace-muted">Scamurai detected potential risks in this message.</p>
                    </div>
                    <ShieldAlert
                      size={18}
                      className="workspace-inline-icon"
                      style={{ color: selectedEmail.riskLevel === 'HIGH' ? '#ff3b30' : '#ffcc00' }}
                    />
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
                        <p className="inbox-score-basis">{selectedEmail.scoreBasis}</p>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span className="workspace-muted">AI Explanation</span>
                        <strong style={{ fontSize: '0.85rem', fontWeight: 'normal', lineHeight: '1.4' }}>
                          {selectedEmail.explanation}
                        </strong>
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
                  <button className="workspace-btn workspace-btn-secondary" type="button" style={{ padding: '0.4rem', border: 'none' }}>
                    <MoreVertical size={18} />
                  </button>
                </div>

                <div className="inbox-viewer-body">{selectedEmail.body}</div>

                <div className="inbox-meta-grid">
                  <div>
                    <span className="workspace-muted">Links</span>
                    <strong>{selectedEmail.links.length}</strong>
                  </div>
                  <div>
                    <span className="workspace-muted">Attachments</span>
                    <strong>{selectedEmail.attachments.length}</strong>
                  </div>
                  <div>
                    <span className="workspace-muted">Model source</span>
                    <strong>{selectedEmail.modelSource}</strong>
                  </div>
                </div>
              </article>
            </>
          ) : (
            <article className="workspace-panel inbox-viewer-panel inbox-empty-state">
              <Mail size={18} />
              <strong>No message selected</strong>
              <p>Choose a scanned email from the queue to inspect its contents and risk explanation.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
};

export default Inbox;
