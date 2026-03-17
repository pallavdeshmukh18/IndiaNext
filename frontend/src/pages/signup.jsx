import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCarousel from '../components/AuthCarousel';
import { authApi } from '../lib/api';
import brandLogo from '../assets/images/Screenshot_2026-03-17_at_5.21.08_AM-removebg-preview.png';
import './AuthPages.css';

const Signup = ({ onSignup, onGoogleAuth }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onSignup) {
        await onSignup({ name, email, password });
      }
      navigate('/app/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create the account.');
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
            <h2>Create account</h2>
            <p>Join and get started with intelligent threat defense.</p>
          </div >

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="input-group">
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                className="auth-input"
                type="text"
                placeholder="Aarav Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="input-group">
              <label htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                className="auth-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="auth-input"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="input-group">
              <label htmlFor="signup-confirm-password">Confirm password</label>
              <input
                id="signup-confirm-password"
                className="auth-input"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button className="auth-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create Account'}
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
            Already have an account? <Link to="/login" className="auth-link">Log in</Link>
          </p>
        </div >
      </section >
    </div >
  );
};

export default Signup;
