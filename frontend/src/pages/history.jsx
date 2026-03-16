import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Filter, Search, ShieldAlert } from 'lucide-react';
import { analyticsApi } from '../lib/api';
import {
  buildMockAnalytics,
  formatRelativeTime,
  getMockScans,
  normalizeScan
} from '../lib/mockData';
import './WorkspacePages.css';

function riskClassName(riskLevel) {
  return `risk-pill ${String(riskLevel || 'LOW').toLowerCase()}`;
}

const HistoryPage = ({ session }) => {
  const [state, setState] = React.useState({
    loading: true,
    source: 'live',
    scans: []
  });
  const [riskFilter, setRiskFilter] = React.useState('ALL');
  const [channelFilter, setChannelFilter] = React.useState('ALL');
  const [query, setQuery] = React.useState('');
  const deferredQuery = React.useDeferredValue(query);

  React.useEffect(() => {
    let cancelled = false;

    async function loadScans() {
      try {
        const response = await analyticsApi.getScans(session.token, { page: 1, limit: 40 });
        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          source: 'live',
          scans: (response?.scans || []).map(normalizeScan)
        });
      } catch {
        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          source: 'mock',
          scans: getMockScans()
        });
      }
    }

    loadScans();

    return () => {
      cancelled = true;
    };
  }, [session.token]);

  const filteredScans = React.useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return state.scans.filter((scan) => {
      const matchesRisk = riskFilter === 'ALL' || scan.riskLevel === riskFilter;
      const matchesChannel = channelFilter === 'ALL' || scan.inputType === channelFilter;
      const matchesQuery = !normalizedQuery
        || scan.content.toLowerCase().includes(normalizedQuery)
        || scan.prediction.toLowerCase().includes(normalizedQuery)
        || scan.explanation.join(' ').toLowerCase().includes(normalizedQuery);

      return matchesRisk && matchesChannel && matchesQuery;
    });
  }, [channelFilter, deferredQuery, riskFilter, state.scans]);

  const summary = React.useMemo(() => buildMockAnalytics(filteredScans), [filteredScans]);

  return (
    <div className="workspace-page">
      <section className="workspace-page-hero">
        <div className="workspace-page-hero-copy">
          <div className={`workspace-data-badge ${state.source}`}>
            {state.source === 'live' ? 'Live history' : 'Fallback case archive'}
          </div>
          <h2>Every detection stays searchable and explainable</h2>
          <p>
            The history view is where an analyst can revisit the reasoning behind a verdict, recover source context,
            and confirm whether a case needs follow-up in the alerts queue.
          </p>
        </div>

        <div className="workspace-page-hero-actions">
          <Link to="/app/analyze" className="workspace-btn workspace-btn-primary">
            Scan something new <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header">
          <div>
            <h3>Filter the archive</h3>
            <p>Search by verdict, message text, or explainability notes while narrowing by severity and channel.</p>
          </div>
          <Filter size={18} className="workspace-inline-icon" />
        </div>

        <div className="history-toolbar">
          <div>
            <label className="history-label" htmlFor="history-search">Search</label>
            <input
              id="history-search"
              className="analysis-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prediction, content, or explanation"
            />
          </div>

          <div>
            <label className="history-label" htmlFor="history-risk">Risk</label>
            <select id="history-risk" className="history-select" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
              <option value="ALL">All levels</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="history-label" htmlFor="history-channel">Channel</label>
            <select id="history-channel" className="history-select" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
              <option value="ALL">All channels</option>
              <option value="email">Email</option>
              <option value="url">URL</option>
              <option value="message">Message</option>
              <option value="prompt">Prompt</option>
              <option value="screenshot">OCR text</option>
            </select>
          </div>
        </div>

        <div className="history-summary">
          <span className="workspace-pill"><Search size={14} /> {filteredScans.length} matching cases</span>
          <span className="workspace-pill"><ShieldAlert size={14} /> {summary.highRisk} high-risk</span>
          <span className="workspace-pill"><Clock3 size={14} /> {state.loading ? 'Loading archive...' : 'Archive ready'}</span>
        </div>
      </section>

      <section className="history-grid">
        {filteredScans.length ? (
          filteredScans.map((scan) => (
            <article key={scan.id} className="history-card">
              <div className="history-card-header">
                <div>
                  <strong>{scan.prediction}</strong>
                  <div className="workspace-meta-row">
                    <span>{formatRelativeTime(scan.createdAt)}</span>
                    <span>{scan.inputType}</span>
                    <span>{scan.confidence}% confidence</span>
                  </div>
                </div>
                <span className={riskClassName(scan.riskLevel)}>{scan.riskLevel}</span>
              </div>

              <div className="history-content-preview">
                <p>{scan.content}</p>
              </div>

              <div className="analysis-list">
                <div className="analysis-block">
                  <h4>Why it was flagged</h4>
                  <p>{scan.explanation[0]}</p>
                </div>

                <div className="analysis-block">
                  <h4>Recommended next step</h4>
                  <p>{scan.recommendations[0]}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            No scans match the current filters. Adjust the search criteria or run a fresh analysis to seed the archive.
          </div>
        )}
      </section>
    </div>
  );
};

export default HistoryPage;