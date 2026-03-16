import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import authIllustration from '../assets/auth-illustration.png';
import './AuthPages.css';

const Login = ({ onLogin, onGoogleAuth }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onLogin) {
        await onLogin({ email, password });
      }
      navigate('/app/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (onGoogleAuth) {
        await onGoogleAuth({ provider: 'google', intent: 'login' });
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to start Google authentication.');
    }
  };

  return (
    <div className="auth-page-wrapper">
      <aside className="auth-left-panel">
        <div className="auth-left-grid"></div>
        <img src={authIllustration} alt="Cybersecurity interface" className="auth-illustration" />
        <div className="auth-hero-text">
          <h1>Stop threats before they spread</h1>
          <p>Sign in to continue monitoring suspicious activity in real time.</p>
        </div>
      </aside>

      <section className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <ShieldAlert size={20} />
              <span>Krypton</span>
            </Link>
            <h2>Welcome back</h2>
            <p>Log in to continue securing your workspace.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="input-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                className="auth-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="auth-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button className="auth-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Log In'}
            </button>

            <div className="auth-divider" aria-hidden="true">
              <span>or continue with</span>
            </div>

            <button className="auth-google-btn" type="button" onClick={handleGoogleAuth} disabled={isSubmitting}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <path fill="#EA4335" d="M24 9.5c3.36 0 6.39 1.16 8.77 3.44l6.52-6.52C35.33 2.83 30.02.5 24 .5 14.62.5 6.51 5.88 2.56 13.72l7.91 6.14C12.4 13.79 17.72 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.56-.13-3.06-.4-4.5H24v9h12.7c-.55 2.95-2.22 5.45-4.74 7.13l7.38 5.71c4.3-3.96 6.76-9.8 6.76-17.34z"/>
                <path fill="#FBBC05" d="M10.47 28.14a14.5 14.5 0 010-8.28l-7.91-6.14A23.98 23.98 0 000 24c0 3.86.92 7.51 2.56 10.28l7.91-6.14z"/>
                <path fill="#34A853" d="M24 47.5c6.02 0 11.08-1.99 14.77-5.4l-7.38-5.71c-2.05 1.38-4.66 2.11-7.39 2.11-6.28 0-11.6-4.29-13.53-10.36l-7.91 6.14C6.51 42.12 14.62 47.5 24 47.5z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="auth-footer">
            New to Krypton? <Link to="/signup" className="auth-link">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
