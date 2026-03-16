import React from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Cpu, Eye, ShieldCheck, ArrowRight } from 'lucide-react';
import './WorkflowSection.css';

const steps = [
    {
        id: 1,
        icon: <FileSearch size={28} />,
        title: "Input Analysis",
        desc: "Raw payloads, email headers, and traffic streams are ingested and normalized into structured threat vectors.",
        time: "~1ms",
        color: "#fca5a5"
    },
    {
        id: 2,
        icon: <Cpu size={28} />,
        title: "AI Detection",
        desc: "Multi-model ensemble scans for anomalies, pattern matches against known CVEs, and zero-day behavioral signals.",
        time: "~8ms",
        color: "#fca5a5"
    },
    {
        id: 3,
        icon: <Eye size={28} />,
        title: "Explainability",
        desc: "Every classification is broken into human-readable signals — what triggered it, why, and with what confidence.",
        time: "~3ms",
        color: "#fca5a5"
    },
    {
        id: 4,
        icon: <ShieldCheck size={28} />,
        title: "Active Defense",
        desc: "Automated playbooks execute: block IPs, quarantine payloads, alert analysts, and log for compliance.",
        time: "~2ms",
        color: "#fca5a5"
    }
];

const WorkflowSection = () => {
    return (
        <section className="workflow-section" id="how-it-works">
            <div className="section-header">
                <p className="section-label"><span className="section-label-dot"></span>02 — HOW IT WORKS</p>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    Unified Threat Workflow
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="section-subtitle"
                >
                    From raw data to actionable defense in milliseconds.
                </motion.p>
            </div>

            <div className="workflow-cards">
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <motion.div
                            className="workflow-card glass-panel"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            style={{ '--step-color': step.color }}
                        >
                            <div className="wf-card-top">
                                <div className="wf-step-num">{String(step.id).padStart(2, '0')}</div>
                                <div className="wf-time-badge">{step.time}</div>
                            </div>
                            <div className="wf-icon-wrap" style={{ background: `${step.color}18`, border: `1px solid ${step.color}40` }}>
                                <span style={{ color: step.color }}>{step.icon}</span>
                            </div>
                            <h4 className="wf-title">{step.title}</h4>
                            <p className="wf-desc">{step.desc}</p>
                            <div className="wf-card-accent" style={{ background: `linear-gradient(90deg, ${step.color}, transparent)` }} />
                        </motion.div>
                        {index < steps.length - 1 && (
                            <motion.div
                                className="wf-arrow"
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.2 + index * 0.15 }}
                            >
                                <ArrowRight size={18} />
                            </motion.div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
};

export default WorkflowSection;
