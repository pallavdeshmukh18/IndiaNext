import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  BellRing,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Sparkles,
  History as HistoryIcon
} from 'lucide-react';
import './AppShell.css';

const navItems = [
  {
    to: '/app/dashboard',
    label: 'Overview',
    caption: 'KPIs, trends, latest cases',
    icon: LayoutDashboard
  },
  {
    to: '/app/analyze',
    label: 'Analyze',
    caption: 'Scan suspicious content',
    icon: Activity
  },
  {
    to: '/app/history',
    label: 'History',
    caption: 'Search previous detections',
    icon: HistoryIcon
  },
  {
    to: '/app/alerts',
    label: 'Alerts',
    caption: 'Triage priority incidents',
    icon: BellRing
  }
];

const pageMeta = {
  '/app/dashboard': {
    eyebrow: 'OPERATIONS',
    title: 'Security overview',
    description: 'Track scan throughput, risk distribution, and active cases without context switching.',
    breadcrumb: 'Overview'
  },
  '/app/analyze': {
    eyebrow: 'ANALYSIS',
    title: 'Run threat analysis',
    description: 'Submit suspicious text, URLs, prompts, or OCR snippets and get an explainable verdict.',
    breadcrumb: 'Analysis'
  },
  '/app/history': {
    eyebrow: 'ARCHIVE',
    title: 'Detection history',
    description: 'Search prior detections by severity, channel, and rationale to speed up investigations.',
    breadcrumb: 'History'
  },
  '/app/alerts': {
    eyebrow: 'ALERTS',
    title: 'Priority alert queue',
    description: 'Focus on the incidents that need immediate action and preserve response context.',
    breadcrumb: 'Alerts'
  }
};

function getInitials(session) {
  const seed = session?.name || session?.email || 'Krypton';
  return seed
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AppShell = ({ session, onLogout }) => {
  const location = useLocation();
  const currentMeta = pageMeta[location.pathname] || pageMeta['/app/dashboard'];
  const routeName = location.pathname.split('/')[2] || 'dashboard';

  return (
    <div className={`workspace-shell route-${routeName}`}>
      <aside className="workspace-sidebar glass-panel">
        <Link to="/" className="workspace-brand">
          <span className="workspace-brand-icon">
            <ShieldAlert size={20} />
          </span>
          <span className="workspace-brand-copy">
            <strong>Krypton</strong>
            <small>AI threat detection</small>
          </span>
        </Link>

        <nav className="workspace-nav">
          {navItems.map(({ to, label, caption, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? ' active' : ''}`
              }
            >
              <span className="workspace-nav-icon">
                <Icon size={18} />
              </span>
              <span className="workspace-nav-copy">
                <strong>{label}</strong>
                <small>{caption}</small>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="workspace-sidebar-card">
          <div className="workspace-sidebar-label">Signed in</div>
          <div className="workspace-analyst-row">
            <div className="workspace-avatar">{getInitials(session)}</div>
            <div className="workspace-analyst-copy">
              <strong>{session?.name || 'Security Analyst'}</strong>
              <span>{session?.email}</span>
            </div>
          </div>

          <button
            type="button"
            className="workspace-btn workspace-btn-secondary workspace-logout"
            onClick={onLogout}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-copy">
            <div className="section-label">
              <span className="section-label-dot"></span>
              {currentMeta.eyebrow}
            </div>
            <h1>{currentMeta.title}</h1>
            <p>{currentMeta.description}</p>
          </div>

          <div className="workspace-topbar-actions">
            <Link to="/app/analyze" className="workspace-btn workspace-btn-primary">
              <Activity size={16} />
              New scan
            </Link>
            <Link to="/app/alerts" className="workspace-btn workspace-btn-secondary">
              <BellRing size={16} />
              Review alerts
            </Link>
          </div>
        </header>

        <div className="workspace-crumb glass-panel">
          <span>Workspace</span>
          <ChevronRight size={14} />
          <span>{currentMeta.breadcrumb}</span>
          <div className="workspace-crumb-status">
            <Sparkles size={14} />
            Signed in session
          </div>
        </div>

        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;