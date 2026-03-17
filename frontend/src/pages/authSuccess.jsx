import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthSuccess = ({ onComplete }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        const token = searchParams.get('token');
        const userId = searchParams.get('userId') || '';
        const email = searchParams.get('email') || '';
        const name = searchParams.get('name') || '';

        if (!token) {
            setError('No authentication token received.');
            setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
        }

        // Build session from token and redirect to dashboard
        onComplete?.({
            userId,
            email,
            name,
            token,
            gmailConnected: true
        });

        navigate('/app/dashboard', { replace: true });
    }, [navigate, onComplete, searchParams]);

    return (
        <div className="auth-page-wrapper">
            <section className="auth-right-panel">
                <div className="auth-card">
                    <div className="auth-header">
                        <h2>{error ? 'Authentication Failed' : 'Completing Sign In'}</h2>
                        <p>{error || 'You are being redirected to your dashboard...'}</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AuthSuccess;
