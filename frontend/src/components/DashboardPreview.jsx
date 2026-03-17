import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';
import './DashboardPreview.css';

const MOCK_METRICS = {
    totalScans: 842,
    criticalRiskCount: 14,
    highRiskCount: 42,
    lowRiskCount: 189
};

const MOCK_RECENT_SCAN = {
    inputType: "Prompt Injection",
    channel: "Web Dashboard",
    prediction: "Prompt Manipulation",
    confidence: 92,
    riskLevel: "CRITICAL",
    explanation: "Identifies manipulation attempts and malicious instructions aimed at overriding system prompts.",
    recommendations: [
        "Block IP & Terminate Session",
        "Reset system prompt context",
        "Flag user account for review"
    ],
    logs: [
        { time: "14:32:01", msg: "POST /api/v1/analyze", type: "normal" },
        { time: "14:32:03", msg: "Extracting vector embeddings...", type: "normal" },
        { time: "14:32:04", msg: "WARN: Suspicious payload detected", type: "warn" },
        { time: "14:32:05", msg: "Matching against known threat vectors...", type: "normal" },
        { time: "14:32:05", msg: "MATCH FOUND: Prompt Injection (Type 4)", type: "critical" },
    ]
};

const DashboardPreview = () => {
    const [metrics, setMetrics] = useState(MOCK_METRICS);
    const [recentScan, setRecentScan] = useState(MOCK_RECENT_SCAN);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const fetchLiveStats = async () => {
            try {
                // Try fetching from the backend
                // Note: These routes require auth, so this will likely fail for unauthenticated landing page visitors.
                // It will gracefully fall back to MOCK data.
                const token = localStorage.getItem('token');
                if (!token) return;

                const headers = { Authorization: `Bearer ${token}` };
                
                const [analyticsRes, scansRes] = await Promise.all([
                    fetch('http://localhost:8000/api/analytics', { headers }),
                    fetch('http://localhost:8000/api/scans?limit=1', { headers })
                ]);

                if (analyticsRes.ok && scansRes.ok) {
                    const analyticsData = await analyticsRes.json();
                    const scansData = await scansRes.json();

                    if (analyticsData.success) {
                        setMetrics({
                            totalScans: analyticsData.data.totalScans || 0,
                            criticalRiskCount: analyticsData.data.criticalRiskCount || 0,
                            highRiskCount: analyticsData.data.highRiskCount || 0,
                            lowRiskCount: analyticsData.data.lowRiskCount || 0
                        });
                    }

                    if (scansData.success && scansData.data.length > 0) {
                        const latest = scansData.data[0];
                        setRecentScan({
                            inputType: latest.inputType || "Unknown",
                            channel: latest.channel || "API",
                            prediction: latest.prediction || "Analysis Complete",
                            confidence: latest.confidence || 0,
                            riskLevel: latest.riskLevel || "UNKNOWN",
                            explanation: latest.explanation || "No explanation provided.",
                            recommendations: latest.recommendations || [],
                            logs: MOCK_RECENT_SCAN.logs // Synthesize logs for visual effect
                        });
                    }
                    setIsLive(true);
                }
            } catch (error) {
                console.log("Using static data for dashboard preview (backend offline or unauthenticated).");
            }
        };

        fetchLiveStats();
    }, []);

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
                        <div className="tab active">krypton-dashboard {isLive && <span className="live-indicator"></span>}</div>
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
                            {recentScan.logs.map((log, index) => (
                                <span key={index} className={`code-line ${log.type === 'warn' ? 'highlight-err' : log.type === 'critical' ? 'highlight-err blink' : ''}`}>
                                    <span className="code-time">[{log.time}]</span> {log.msg}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - Risk Score & Analysis */}
                    <div className="panel-right">
                        <div className="risk-score-card">
                            <div className="risk-header">
                                <span>Threat Level</span>
                                <AlertTriangle size={18} className={recentScan.riskLevel === 'CRITICAL' || recentScan.riskLevel === 'HIGH' ? 'text-red' : 'text-yellow'} />
                            </div>
                            <div className={`risk-value ${recentScan.riskLevel === 'CRITICAL' || recentScan.riskLevel === 'HIGH' ? 'text-red' : 'text-yellow'}`}>
                                {recentScan.riskLevel}
                            </div>
                            <div className="confidence-bar">
                                <div className={`confidence-fill ${recentScan.riskLevel === 'CRITICAL' || recentScan.riskLevel === 'HIGH' ? 'red' : 'yellow'}`} style={{ width: `${recentScan.confidence}%` }}></div>
                            </div>
                            <div className="confidence-text">{recentScan.confidence}% AI Confidence</div>
                        </div>

                        <div className="analysis-card mt-4">
                            <div className="analysis-header">Explanation</div>
                            <ul className="analysis-list">
                                <li><ChevronRight size={14} /> {recentScan.explanation}</li>
                                <li><ChevronRight size={14} /> Analyzed via {recentScan.channel}</li>
                            </ul>
                        </div>

                        <div className="action-card mt-4">
                            <div className="action-header">Recommended Action</div>
                            <div className="action-row">
                                <ShieldCheck size={20} className="text-green" />
                                <span>{recentScan.recommendations[0] || "Review manually"}</span>
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
