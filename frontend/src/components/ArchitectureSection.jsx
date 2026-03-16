import React from 'react';
import { motion } from 'framer-motion';
import './ArchitectureSection.css';

const ArchitectureSection = () => {
    return (
        <section className="architecture-section" id="architecture">
            <div className="section-header">
                <p className="section-label"><span className="section-label-dot"></span>06 — ARCHITECTURE</p>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    System <span className="text-gradient">Architecture</span>
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="section-subtitle"
                >
                    A robust, scalable pipeline designed for zero-latency threat mitigation.
                </motion.p>
            </div>

            <div className="arch-diagram-wrapper">
                <motion.div
                    className="arch-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.2 } }
                    }}
                >
                    {/* Layer 1: Input */}
                    <div className="arch-layer">
                        <motion.div variants={nodeVariants} className="arch-node glass-panel">API Input</motion.div>
                        <motion.div variants={nodeVariants} className="arch-node glass-panel">Email Gateway</motion.div>
                        <motion.div variants={nodeVariants} className="arch-node glass-panel">Web Traffic</motion.div>
                    </div>

                    {/* Connection 1 */}
                    <div className="arch-connections">
                        <div className="conn-line horizontal pulse-line"></div>
                    </div>

                    {/* Layer 2: Core Engine */}
                    <div className="arch-layer core-layer">
                        <div className="core-box glass-panel">
                            <div className="core-title">Krypton Core Engine</div>
                            <div className="core-modules">
                                <motion.div variants={nodeVariants} className="arch-node internal">Detection Engine</motion.div>
                                <motion.div variants={nodeVariants} className="arch-node internal highlight">Explainability Engine</motion.div>
                                <motion.div variants={nodeVariants} className="arch-node internal">Risk Scoring</motion.div>
                            </div>
                        </div>
                    </div>

                    {/* Connection 2 */}
                    <div className="arch-connections split">
                        <div className="conn-line fork up pulse-line delay-1"></div>
                        <div className="conn-line fork pulse-line delay-2"></div>
                    </div>

                    {/* Layer 3: Output */}
                    <div className="arch-layer output-layer">
                        <motion.div variants={nodeVariants} className="arch-node glass-panel action-node">Automated Defense</motion.div>
                        <motion.div variants={nodeVariants} className="arch-node glass-panel dash-node">SOC Dashboard</motion.div>
                    </div>

                </motion.div>
            </div>
        </section>
    );
};

const nodeVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

export default ArchitectureSection;
