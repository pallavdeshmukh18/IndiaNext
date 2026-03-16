import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock3,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { analyticsApi } from '../lib/api';
import {
  buildMockAnalytics,
  formatRelativeTime,
  getMockAlerts,
  getMockScans,
  getMockThreatTypes,
  getMockTrendData,
  normalizeScan
} from '../lib/mockData';
import './WorkspacePages.css';

const emptyAnalytics = {
  totalScans: 0,
  highRisk: 0,
  mediumRisk: 0,
  lowRisk: 0
};

function riskClassName(riskLevel) {
  return `risk-pill ${String(riskLevel || 'LOW').toLowerCase()}`;
}

const Dashboard = ({ session }) => {
  const [state, setState] = React.useState({
    loading: true,
    source: 'live',
    analytics: emptyAnalytics,
    trends: [],
    threatTypes: [],
    alerts: [],
    scans: []
  });

  React.useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [analyticsResponse, trendsResponse, threatTypesResponse, alertsResponse, scansResponse] = await Promise.all([
          analyticsApi.getAnalytics(session.token),
          analyticsApi.getTrends(session.token),
          analyticsApi.getThreatTypes(session.token),
          analyticsApi.getAlerts(session.token),
          analyticsApi.getScans(session.token, { page: 1, limit: 8 })
        ]);

        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          source: 'live',
          analytics: analyticsResponse?.data || emptyAnalytics,
          trends: trendsResponse?.data || [],
          threatTypes: threatTypesResponse?.data || [],
          alerts: (alertsResponse?.alerts || []).map(normalizeScan),
          scans: (scansResponse?.scans || []).map(normalizeScan)
        });
      } catch {
        if (cancelled) {
          return;
        }

        const fallbackScans = getMockScans();
        setState({
          loading: false,
          source: 'mock',
          analytics: buildMockAnalytics(fallbackScans),
          trends: getMockTrendData(fallbackScans),
          threatTypes: getMockThreatTypes(fallbackScans),
          alerts: getMockAlerts(fallbackScans),
          scans: fallbackScans.slice(0, 8)
        });
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [session.token]);

  const maxTrend = React.useMemo(() => {
    const values = state.trends.map((entry) => entry.scans);
    return Math.max(1, ...values);
  }, [state.trends]);

  const totalThreatTypes = React.useMemo(() => {
    return state.threatTypes.reduce((sum, entry) => sum + entry.count, 0);
  }, [state.threatTypes]);

  const metricCards = [
    {
      label: 'Total scans',
      value: state.analytics.totalScans,
      footnote: 'Threat submissions processed',
      icon: Activity
    },
    {
      label: 'High risk',
      value: state.analytics.highRisk,
      footnote: 'Immediate analyst attention',
      icon: ShieldAlert
    },
    {
      label: 'Medium risk',
      value: state.analytics.mediumRisk,
      footnote: 'Watch closely and validate context',
      icon: AlertTriangle
    },
    {
      label: 'Low risk',
      value: state.analytics.lowRisk,
      footnote: 'Monitor without escalation',
      icon: ShieldCheck
    }
  ];

  return (
    <div className="workspace-page">
      <section className="workspace-page-hero">
        <div className="workspace-page-hero-copy">
          <h2>Your security posture at a glance</h2>
          <p>
            See total scan volume, high-risk cases, threat distribution, and recent activity in one focused view.
          </p>
        </div>

        <div className="workspace-page-hero-actions">
          <Link to="/app/analyze" className="workspace-btn workspace-btn-primary">
            Run a new scan <ArrowRight size={16} />
          </Link>
          <Link to="/app/history" className="workspace-btn workspace-btn-secondary">
            Inspect case history
          </Link>
        </div>
      </section>

      <section className="workspace-metric-grid">
        {metricCards.map(({ label, value, footnote, icon: Icon }) => (
          <article key={label} className="workspace-metric-card">
            <div className="workspace-metric-heading">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <div className="workspace-metric-value">{value}</div>
            <div className="workspace-metric-footnote">{footnote}</div>
          </article>
        ))}
      </section>

      <section className="workspace-two-column">
        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Threat activity timeline</h3>
              <p>Daily scan volume so spikes and coordinated campaigns are easy to spot.</p>
            </div>
            <Clock3 size={18} className="workspace-inline-icon" />
          </div>

          {state.trends.length ? (
            <div className="trend-chart">
              {state.trends.map((entry) => (
                <div key={entry.date} className="trend-row">
                  <div className="trend-meta">
                    <span>{entry.date}</span>
                    <span>{entry.scans} scans</span>
                  </div>
                  <div className="trend-track">
                    <div
                      className="trend-fill"
                      style={{ width: `${Math.max(12, (entry.scans / maxTrend) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Clock3 size={24} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
              <strong>No trend data available</strong>
              <p>Run a scan to start building analyst telemetry over time.</p>
            </div>
          )}
        </article>

        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Top threat types</h3>
              <p>Breakdown of the threat categories most frequently detected in your submissions.</p>
            </div>
            <ShieldAlert size={18} className="workspace-inline-icon" />
          </div>

          {state.threatTypes.length ? (
            <div className="type-list">
              {state.threatTypes.map((entry) => {
                const width = totalThreatTypes ? (entry.count / totalThreatTypes) * 100 : 0;
                return (
                  <div key={entry.threatType} className="type-row">
                    <div className="type-row-header">
                      <strong>{entry.threatType}</strong>
                      <span>{entry.count}</span>
                    </div>
                    <div className="type-meter">
                      <div className="type-meter-fill" style={{ width: `${Math.max(10, width)}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <ShieldAlert size={24} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
              <strong>No threat data</strong>
              <p>Threat type aggregation will appear after your first stored detections.</p>
            </div>
          )}
        </article>
      </section>

      <section className="workspace-two-column">
        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Critical alerts</h3>
              <p>High-risk cases are prioritized first so analysts can respond quickly.</p>
            </div>
            <AlertTriangle size={18} className="workspace-inline-icon" />
          </div>

          {state.alerts.length ? (
            <div className="alert-list">
              {state.alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="alert-row">
                  <div className="alert-row-header">
                    <strong>{alert.prediction}</strong>
                    <span className={riskClassName(alert.riskLevel)}>{alert.riskLevel}</span>
                  </div>
                  <p>{alert.explanation[0]}</p>
                  <div className="workspace-meta-row">
                    <span>{formatRelativeTime(alert.createdAt)}</span>
                    <span>{alert.inputType}</span>
                    {alert.source ? <span>{alert.source}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ShieldCheck size={24} style={{ opacity: 0.4, marginBottom: '0.75rem', color: '#34c759' }} />
              <strong>All clear</strong>
              <p>No high-risk alerts are active in your queue right now.</p>
            </div>
          )}

          <div className="workspace-panel-footer">
            <span className="workspace-muted">{state.alerts.length} priority items in queue</span>
            <Link to="/app/alerts" className="workspace-link">
              Open alerts <ArrowRight size={14} />
            </Link>
          </div>
        </article>

        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <h3>Recent scan activity</h3>
              <p>Review recent detections with context, confidence, and recommended response steps.</p>
            </div>
            <Activity size={18} className="workspace-inline-icon" />
          </div>

          {state.scans.length ? (
            <div className="scan-list">
              {state.scans.slice(0, 4).map((scan) => (
                <div key={scan.id} className="scan-row">
                  <div className="scan-row-header">
                    <strong>{scan.prediction}</strong>
                    <span className={riskClassName(scan.riskLevel)}>{scan.riskLevel}</span>
                  </div>
                  <p>{scan.content.slice(0, 132)}{scan.content.length > 132 ? '...' : ''}</p>
                  <div className="workspace-meta-row">
                    <span>{formatRelativeTime(scan.createdAt)}</span>
                    <span>{scan.inputType}</span>
                    <span>{scan.confidence}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Activity size={24} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
              <strong>No history found</strong>
              <p>Start by submitting a new threat for interactive analysis.</p>
            </div>
          )}

          <div className="workspace-panel-footer">
            <span className="workspace-muted">{state.loading ? 'Loading analyst queue...' : `${state.scans.length} recent scans loaded`}</span>
            <Link to="/app/history" className="workspace-link">
              View full history <ArrowRight size={14} />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
