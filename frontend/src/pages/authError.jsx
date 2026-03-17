import React from 'react';
import { useNavigate } from 'react-router-dom';

const AuthError = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        // Redirect to login after 3 seconds
        const timeout = setTimeout(() => {
            navigate('/login', { replace: true });
        }, 3000);

        return () => clearTimeout(timeout);
    }, [navigate]);

    return (
        <div className="auth-page-wrapper">
            <section className="auth-right-panel">
                <div className="auth-card">
                    <div className="auth-header">
                        <h2>Authentication Failed</h2>
                        <p>There was an error processing your authentication. You will be redirected to the login page.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AuthError;
