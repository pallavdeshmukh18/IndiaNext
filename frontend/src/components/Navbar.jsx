import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import brandLogo from '../assets/images/Screenshot_2026-03-17_at_5.21.08_AM-removebg-preview.png';
import './Navbar.css';

const Navbar = ({ session }) => {
    return (
        <nav className="navbar-container">
            <Link to="/" className="navbar-logo">
                <img src={brandLogo} alt="Krypton logo" className="logo-icon" />
                <span>Krypton</span>
            </Link >

            <div className="navbar-links glass-pill">
                <a href="#how-it-works">How it Works</a>
                <a href="#threat-detection">Threat Detection</a>
                <a href="#explainable-ai">Explainable AI</a>
                <a href="#dashboard">Dashboard</a>
                <a href="#docs">Docs</a>
            </div>

            <div className="navbar-action" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {session?.token ? (
                    <Link to="/app/dashboard">
                        <button className="btn-primary">
                            <LayoutDashboard size={16} /> Open Console
                        </button>
                    </Link>
                ) : (
                    <>
                        <Link to="/login">
                            <button className="btn-secondary">Log In</button>
                        </Link>
                        <Link to="/signup">
                            <button className="btn-primary">Sign Up</button>
                        </Link>
                    </>
                )}
            </div>
        </nav >
    );
};

export default Navbar;
