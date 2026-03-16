import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import Layout from './pages/layout';
import Landing from './pages/landing';
import Login from './pages/login';
import Signup from './pages/signup';
import Dashboard from './pages/dashboard';
import Analysis from './pages/analysis';
import HistoryPage from './pages/history';
import AlertsPage from './pages/alerts';
import Inbox from './pages/inbox';
import LoadingScreen from './components/LoadingScreen';
import { authApi } from './lib/api';
import { clearSession, loadSession, saveSession } from './lib/session';
import './App.css';

function buildSession(authPayload) {
  return {
    userId: authPayload.userId,
    name: authPayload.name || authPayload.email?.split('@')[0] || 'Analyst',
    email: authPayload.email,
    token: authPayload.token
  };
}

function App() {
  const [appState, setAppState] = React.useState('loading'); // 'loading', 'fading', 'done'
  const [session, setSession] = React.useState(() => loadSession());

  const handleLogin = React.useCallback(async ({ email, password }) => {
    const response = await authApi.login({ email, password });
    const nextSession = buildSession(response);
    saveSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const handleSignup = React.useCallback(async ({ name, email, password }) => {
    const response = await authApi.register({ name, email, password });
    const nextSession = buildSession(response);
    saveSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const handleLogout = React.useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const handleGoogleAuth = React.useCallback(async ({ credential }) => {
    const response = await authApi.googleAuth(credential);
    const nextSession = buildSession(response);
    saveSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  return (
    <>
      {appState !== 'done' && (
        <LoadingScreen 
          onFadeStart={() => setAppState('fading')}
          onComplete={() => setAppState('done')} 
        />
      )}
      <div className={`app-content ${appState === 'loading' ? 'is-loading' : appState === 'fading' ? 'is-fading' : 'is-done'}`}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout session={session} />}>
              <Route path="/" element={<Landing />} />
              <Route
                path="/login"
                element={
                  session?.token ? (
                    <Navigate to="/app/dashboard" replace />
                  ) : (
                    <Login onLogin={handleLogin} onGoogleAuth={handleGoogleAuth} />
                  )
                }
              />
              <Route
                path="/signup"
                element={
                  session?.token ? (
                    <Navigate to="/app/dashboard" replace />
                  ) : (
                    <Signup onSignup={handleSignup} onGoogleAuth={handleGoogleAuth} />
                  )
                }
              />
            </Route>

            <Route
              path="/app"
              element={
                session?.token ? (
                  <AppShell session={session} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard session={session} />} />
              <Route path="analyze" element={<Analysis session={session} />} />
              <Route path="inbox" element={<Inbox session={session} />} />
              <Route path="history" element={<HistoryPage session={session} />} />
              <Route path="alerts" element={<AlertsPage session={session} />} />
            </Route>

            <Route
              path="*"
              element={<Navigate to={session?.token ? '/app/dashboard' : '/'} replace />}
            />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;
