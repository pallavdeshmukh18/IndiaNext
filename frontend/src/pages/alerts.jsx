import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BellRing, Clock3, ShieldCheck } from 'lucide-react';
import { analyticsApi } from '../lib/api';
import {
  formatRelativeTime,
  getMockAlerts,
  getMockScans,
  getMockThreatTypes,
  normalizeScan
} from '../lib/mockData';
import './WorkspacePages.css';

function riskClassName(riskLevel) {
  return `risk-pill ${String(riskLevel || 'LOW').toLowerCase()}`;
}

const AlertsPage = ({ session }) => {
  const [state, setState] = React.useState({
    loading: true,
    source: 'live',
    alerts: [],
    topThreats: []
  });

  React.useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      try {
        const [alertsResponse, threatTypesResponse] = await Promise.all([
          analyticsApi.getAlerts(session.token),
          analyticsApi.getThreatTypes(session.token)
        ]);

        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          source: 'live',
          alerts: (alertsResponse?.alerts || []).map(normalizeScan),
          topThreats: threatTypesResponse?.data || []
        });
      } catch {
        if (cancelled) {
          return;
        }

        const fallbackScans = getMockScans();
        setState({
          loading: false,
          source: 'mock',
          alerts: getMockAlerts(fallbackScans),
          topThreats: getMockThreatTypes(fallbackScans)
        });
      }
    }

    loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [session.token]);

  const priorityThreat = state.topThreats[0]?.threatType || 'No dominant threat yet';

  return (
    <div className="workspace-page">
      <section className="workspace-page-hero">
        <div className="workspace-page-hero-copy">
          <div className={`workspace-data-badge ${state.source}`}>
            {state.source === 'live' ? 'Live alert queue' : 'Demo alert queue'}
          </div>
          <h2>Prioritized queue for high-risk incidents</h2>
          <p>
            Keep analyst focus on the cases that need immediate triage, with mitigation context beside each signal.
          </p>
        </div>

        <div className="workspace-page-hero-actions">
          <Link to="/app/analyze" className="workspace-btn workspace-btn-primary">
            Re-run a suspicious case <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="alerts-grid">
        <div className="alert-stack">
          {state.alerts.length ? (
            state.alerts.map((alert) => (
              <article key={alert.id} className="alert-card">
                <div className="alert-row-header">
                  <div>
                    <strong>{alert.prediction}</strong>
                    <div className="workspace-meta-row">
                      <span>{formatRelativeTime(alert.createdAt)}</span>
                      <span>{alert.inputType}</span>
                      <span>{alert.confidence}% confidence</span>
                    </div>
                  </div>
                  <span className={riskClassName(alert.riskLevel)}>{alert.riskLevel}</span>
                </div>

                <div className="alert-content-preview">
                  <p>{alert.content}</p>
                </div>

                <div className="analysis-block">
                  <h4>What triggered the alert</h4>
                  <p>{alert.explanation[0]}</p>
                </div>

                <div className="alert-actions">
                  <span className="workspace-pill"><AlertTriangle size={14} /> Recommended: {alert.recommendations[0]}</span>
                  <Link to="/app/history" className="workspace-link">
                    Open in history <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No critical alerts are active. The queue will populate when a case crosses the high-risk threshold.</div>
          )}
        </div>

        <aside className="playbook-card">
          <div className="workspace-panel-header">
            <div>
              <h3>Response playbook</h3>
              <p>Use queue context to decide what to block, verify, and escalate.</p>
            </div>
            <BellRing size={18} className="workspace-inline-icon" />
          </div>

          <div className="playbook-list">
            <div className="playbook-step">
              <strong>Priority signal</strong>
              <p>{priorityThreat}</p>
            </div>
            <div className="playbook-step">
              <strong>Queue depth</strong>
              <p>{state.loading ? 'Loading queue...' : `${state.alerts.length} alerts require analyst attention.`}</p>
            </div>
            <div className="playbook-step">
              <strong>Suggested ladder</strong>
              <p>Block or quarantine, confirm the sender or domain, then archive evidence into the scan history.</p>
            </div>
          </div>

          <div className="alert-actions">
            <span className="workspace-pill"><Clock3 size={14} /> Continuous triage</span>
            <span className="workspace-pill"><ShieldCheck size={14} /> Analyst-ready context</span>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default AlertsPage;