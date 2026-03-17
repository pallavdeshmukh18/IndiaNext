import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCarousel from '../components/AuthCarousel';
import { authApi } from '../lib/api';
import brandLogo from '../assets/images/Screenshot_2026-03-17_at_5.21.08_AM-removebg-preview.png';
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

  const handleGoogleOAuth = () => {
    window.location.href = authApi.getGoogleOAuthUrl();
  };

  return (
    <div className="auth-page-wrapper">
      <AuthCarousel />

      <section className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <img src={brandLogo} alt="Krypton logo" className="auth-logo-mark" />
              <span>Krypton</span>
            </Link >
            <h2>Welcome back</h2>
            <p>Log in to continue securing your workspace.</p>
          </div >

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

            <div className="auth-google-btn-wrapper">
              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleOAuth}
                disabled={isSubmitting}
              >
                Continue with Google
              </button>
            </div>
          </form>

          <p className="auth-footer">
            New to Krypton? <Link to="/signup" className="auth-link">Create an account</Link>
          </p>
        </div >
      </section >
    </div >
  );
};

export default Login;
