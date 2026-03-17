import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleCallback = ({ onComplete }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const message = searchParams.get('message');

    if (status !== 'success' || !userId) {
      setError(message || 'Google authorization could not be completed.');
      return;
    }

    onComplete?.({
      userId,
      email,
      gmailConnected: true
    });

    navigate('/app/inbox', { replace: true });
  }, [navigate, onComplete, searchParams]);

  return (
    <div className="auth-page-wrapper">
      <section className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{error ? 'Authorization failed' : 'Connecting your inbox'}</h2>
            <p>{error || 'Finishing Google authorization and preparing your Krypton inbox.'}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GoogleCallback;
