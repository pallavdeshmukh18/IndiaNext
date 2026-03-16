import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import AuthCarousel from '../components/AuthCarousel';
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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      if (onGoogleAuth) {
        await onGoogleAuth({ credential: credentialResponse.credential });
      }
      navigate('/app/dashboard', { replace: true });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to complete Google sign-in.');
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  return (
    <div className="auth-page-wrapper">
      <AuthCarousel />

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

            <div className="auth-google-btn-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                width="100%"
                theme="filled_black"
                shape="rectangular"
                text="continue_with"
              />
            </div>
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
