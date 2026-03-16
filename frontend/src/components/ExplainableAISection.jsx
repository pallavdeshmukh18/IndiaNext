import React from 'react';
import { motion } from 'framer-motion';
import { Network, CheckCircle, SearchCode, ShieldAlert } from 'lucide-react';
import './ExplainableAISection.css';

const ExplainableAISection = () => {
    return (
        <section className="explainable-section" id="explainable-ai">
            <div className="explainable-container">
                {/* Left Side: Report Visualization */}
                <motion.div
                    className="explainable-left"
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="report-card glass-panel">
                        <div className="report-header">
                            <Network size={20} className="text-purple" />
                            <span>AI Decision Trace</span>
                        </div>
                        <div className="report-body">
                            <div className="trace-item">
                                <div className="trace-label">Input Vector</div>
                                <div className="trace-value font-mono text-muted">0x8F...A2B</div>
                            </div>
                            <div className="trace-item highlight">
                                <div className="trace-label">Anomaly Detected</div>
                                <div className="trace-value font-mono text-red">Entropy &gt; 0.92</div>
                            </div>
                            <div className="trace-item">
                                <div className="trace-label">Model Activated</div>
                                <div className="trace-value">Behavioral LSTM (v4.2)</div>
                            </div>

                            <div className="confidence-meter mt-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted">Classification Confidence</span>
                                    <span className="text-green font-mono">98.4%</span>
                                </div>
                                <div className="meter-bg">
                                    <motion.div
                                        className="meter-fill"
                                        initial={{ width: 0 }}
                                        whileInView={{ width: '98.4%' }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                    ></motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side: Explanation Details */}
                <motion.div
                    className="explainable-right"
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="section-label"><span className="section-label-dot"></span>05 — EXPLAINABLE AI</p>
                    <h2 className="explainable-title">
                        Don't Just Block.<br />
                        <span className="text-gradient">Understand Why.</span>
                    </h2>
                    <p className="explainable-desc">
                        Black-box AI is a liability in cybersecurity. Our Explainable AI engine provides transparent, human-readable logic for every classification.
                    </p>

                    <div className="feature-list">
                        <div className="feature-item">
                            <div className="feature-icon"><SearchCode size={20} /></div>
                            <div className="feature-text">
                                <h4>Suspicious Keyword Isolation</h4>
                                <p>Highlights exact payload segments that triggered the alert.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon"><ShieldAlert size={20} /></div>
                            <div className="feature-text">
                                <h4>Domain Risk Scoring</h4>
                                <p>Continuous evaluation of domain reputation and age.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon"><CheckCircle size={20} /></div>
                            <div className="feature-text">
                                <h4>Compliance Ready</h4>
                                <p>Export decision traces for SOC2 and ISO compliance audits.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default ExplainableAISection;
