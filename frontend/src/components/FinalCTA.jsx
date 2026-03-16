import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight } from 'lucide-react';
import './FinalCTA.css';

const FinalCTA = () => {
    return (
        <section className="cta-section">
            <motion.div
                className="cta-container glass-panel"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
            >
                <div className="cta-content">
                    <Shield size={56} className="cta-icon" />
                    <h2>Outthink AI-Powered Threats</h2>
                    <p>Deploy autonomous defense that evolves faster than the attackers.</p>
                    <button className="btn-primary cta-btn">
                        Start Threat Scan <ArrowRight size={18} className="ml-2" />
                    </button>
                </div>
                <div className="cta-bg-glow"></div>
            </motion.div>
        </section>
    );
};

export default FinalCTA;
