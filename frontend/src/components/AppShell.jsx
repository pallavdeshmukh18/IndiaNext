import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  BellRing,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Mail,
  Sparkles,
  History as HistoryIcon
} from 'lucide-react';
import brandLogo from '../assets/images/Screenshot_2026-03-17_at_5.21.08_AM-removebg-preview.png';
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
    to: '/app/inbox',
    label: 'Inbox',
    caption: 'Scanned email queue',
    icon: Mail
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
  '/app/inbox': {
    eyebrow: 'INBOX',
    title: 'Protected Inbox',
    description: 'Review scanned communications alongside their real-time threat verdicts.',
    breadcrumb: 'Inbox'
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
            <img src={brandLogo} alt="Krypton logo" className="workspace-brand-logo" />
          </span>
          <span className="workspace-brand-copy">
            <strong>Krypton</strong>
            <small>AI threat detection</small>
          </span>
        </Link>

        <nav className="workspace-nav">
          <div className="workspace-nav-section-title">MENU</div>
          {navItems.map(({ to, label, icon: Icon }) => (
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
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-header-breadcrumb">
            <Link to="/app/dashboard" className="breadcrumb-nav-link">
              <div className="breadcrumb-home-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
            </Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <Link to="/app/dashboard" className="breadcrumb-nav-link">Dashboard</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <Link to={location.pathname} className="breadcrumb-current breadcrumb-nav-link">{currentMeta.breadcrumb}</Link>
          </div>

          <div className="workspace-header-actions">
            <Link to="/app/alerts" className="workspace-header-icon-btn">
              <BellRing size={18} />
              <span className="workspace-header-badge"></span>
            </Link>

            <div className="workspace-user-dropdown">
              <div className="workspace-avatar-small">{getInitials(session)}</div>
              <span>{session?.name?.split(' ')[0] || 'Analyst'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>

            <button className="workspace-header-icon-btn workspace-logout-icon" onClick={onLogout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;