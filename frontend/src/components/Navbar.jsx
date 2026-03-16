import React from 'react';
import { ShieldAlert } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    return (
        <nav className="navbar-container">
            <div className="navbar-logo">
                <ShieldAlert size={24} className="logo-icon" />
                <span>qintara</span>
            </div>

            <div className="navbar-links glass-pill">
                <a href="#how-it-works">How it Works</a>
                <a href="#threat-detection">Threat Detection</a>
                <a href="#explainable-ai">Explainable AI</a>
                <a href="#dashboard">Dashboard</a>
                <a href="#docs">Docs</a>
            </div>

            <div className="navbar-action">
                <button className="btn-primary">Scan a Threat</button>
            </div>
        </nav>
    );
};

export default Navbar;
