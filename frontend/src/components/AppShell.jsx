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
    caption: 'Posture, trends, and intelligence',
    icon: LayoutDashboard
  },
  {
    to: '/app/analyze',
    label: 'Analyze',
    caption: 'Scan links, prompts, and messages',
    icon: Activity
  },
  {
    to: '/app/history',
    label: 'History',
    caption: 'Review past detections',
    icon: HistoryIcon
  },
  {
    to: '/app/alerts',
    label: 'Alerts',
    caption: 'Triage high-risk activity',
    icon: BellRing
  }
];

const pageMeta = {
  '/app/dashboard': {
    eyebrow: 'SOC WORKSPACE',
    title: 'Security operations cockpit',
    description: 'Track live posture, critical signals, and analyst-ready scan output in one product surface.',
    breadcrumb: 'Overview'
  },
  '/app/analyze': {
    eyebrow: 'ACTIVE SCAN',
    title: 'Run a fresh threat analysis',
    description: 'Submit suspicious text, URLs, and prompt payloads without leaving the product shell.',
    breadcrumb: 'Analysis'
  },
  '/app/history': {
    eyebrow: 'CASE ARCHIVE',
    title: 'Review historical detections',
    description: 'Filter previous scans by severity, channel, and content so analysts can move quickly.',
    breadcrumb: 'History'
  },
  '/app/alerts': {
    eyebrow: 'CRITICAL QUEUE',
    title: 'Respond to high-risk alerts',
    description: 'Focus the queue on the threats that need immediate human action.',
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

  return (
    <div className="workspace-shell">
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
          <span>Product flow</span>
          <ChevronRight size={14} />
          <span>{currentMeta.breadcrumb}</span>
          <div className="workspace-crumb-status">
            <Sparkles size={14} />
            Authenticated session
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