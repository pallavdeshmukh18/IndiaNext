import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';
import './DashboardPreview.css';

const DashboardPreview = () => {
    return (
        <section className="dashboard-section" id="dashboard">
            <div className="section-header">
                <p className="section-label"><span className="section-label-dot"></span>03 — LIVE INTELLIGENCE</p>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    Real-Time <span className="text-gradient">Threat Intelligence</span>
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="section-subtitle"
                >
                    Experience an intuitive interface that transforms complex algorithmic signals into clear, actionable security postures.
                </motion.p>
            </div>

            <motion.div
                className="dashboard-mockup glass-panel"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                {/* Mockup Top Bar */}
                <div className="mockup-header">
                    <div className="window-controls">
                        <span className="dot red"></span>
                        <span className="dot yellow"></span>
                        <span className="dot green"></span>
                    </div>
                    <div className="mockup-tabs">
                        <div className="tab active">qintara-dashboard</div>
                        <div className="tab">logs</div>
                    </div>
                </div>

                {/* Mockup Body */}
                <div className="mockup-body">
                    {/* Left Panel - Threat Input */}
                    <div className="panel-left">
                        <div className="panel-title">
                            <Activity size={18} /> Process Stream
                        </div>
                        <div className="code-block">
                            <span className="code-line"><span className="code-time">[14:32:01]</span> POST /api/v1/auth/verify</span>
                            <span className="code-line"><span className="code-time">[14:32:03]</span> Connecting... 192.168.1.144</span>
                            <span className="code-line highlight-err"><span className="code-time">[14:32:04]</span> WARN: Suspicious payload detected</span>
                            <span className="code-line"><span className="code-time">[14:32:04]</span> Extracting vector embeddings...</span>
                            <span className="code-line"><span className="code-time">[14:32:05]</span> Matching against known threat vectors...</span>
                            <span className="code-line highlight-err blink"><span className="code-time">[14:32:05]</span> MATCH FOUND: Prompt Injection (Type 4)</span>
                        </div>
                    </div>

                    {/* Right Panel - Risk Score & Analysis */}
                    <div className="panel-right">
                        <div className="risk-score-card">
                            <div className="risk-header">
                                <span>Threat Level</span>
                                <AlertTriangle size={18} className="text-red" />
                            </div>
                            <div className="risk-value text-red">Critical</div>
                            <div className="confidence-bar">
                                <div className="confidence-fill red" style={{ width: '92%' }}></div>
                            </div>
                            <div className="confidence-text">92% AI Confidence</div>
                        </div>

                        <div className="analysis-card mt-4">
                            <div className="analysis-header">Explanation</div>
                            <ul className="analysis-list">
                                <li><ChevronRight size={14} /> Obfuscated javascript in form input</li>
                                <li><ChevronRight size={14} /> Domain age &lt; 24 hours</li>
                                <li><ChevronRight size={14} /> Matches pattern: CVE-2023-4412</li>
                            </ul>
                        </div>

                        <div className="action-card mt-4">
                            <div className="action-header">Recommended Action</div>
                            <div className="action-row">
                                <ShieldCheck size={20} className="text-green" />
                                <span>Block IP & Terminate Session</span>
                            </div>
                            <button className="btn-action">Execute Defense</button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

export default DashboardPreview;
