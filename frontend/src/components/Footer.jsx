import React from 'react';
import { Github } from 'lucide-react';
import brandLogo from '../assets/images/Screenshot_2026-03-17_at_5.21.08_AM-removebg-preview.png';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer-section">
            <div className="footer-content">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <img src={brandLogo} alt="Krypton logo" className="footer-logo-mark" />
                        <span>Krypton</span>
                    </div >
                    <p className="footer-copyright">
                        © {new Date().getFullYear()} Krypton. All rights reserved.
                    </p>
                </div >

                <div className="footer-links">
                    <div className="link-column">
                        <h4>Product</h4>
                        <a href="#how-it-works">How it Works</a>
                        <a href="#threat-detection">Threat Detection</a>
                        <a href="#explainable-ai">Explainable AI</a>
                    </div>
                    <div className="link-column">
                        <h4>Resources</h4>
                        <a href="#docs">Documentation</a>
                        <a href="#team">Team</a>
                        <a href="#hackathon">Hackathon</a>
                        <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                            <Github size={14} /> GitHub
                        </a>
                    </div>
                </div>
            </div >
        </footer >
    );
};

export default Footer;
