import React from 'react';
import { MailWarning, Link as LinkIcon, UserX, MessageSquareWarning } from 'lucide-react';
import { motion } from 'framer-motion';
import './ProblemSection.css';

const problems = [
    {
        icon: <MailWarning size={32} className="problem-icon" />,
        title: "Phishing Emails",
        desc: "Advanced social engineering and spear-phishing disguised as trusted sources."
    },
    {
        icon: <LinkIcon size={32} className="problem-icon" />,
        title: "Malicious URLs",
        desc: "Zero-day domains and deceptive links crafted to bypass traditional filters."
    },
    {
        icon: <UserX size={32} className="problem-icon" />,
        title: "Deepfake Impersonation",
        desc: "AI-generated audio and video impersonating executives for financial fraud."
    },
    {
        icon: <MessageSquareWarning size={32} className="problem-icon" />,
        title: "Prompt Injection",
        desc: "Adversarial inputs designed to manipulate LLMs and extract sensitive data."
    }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const ProblemSection = () => {
    return (
        <section className="problem-section" id="threat-detection">
            <div className="section-header">
                <p className="section-label"><span className="section-label-dot"></span>01 — THREATS</p>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    AI Is Making Cyber Attacks <span className="text-gradient">Smarter</span>
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="section-subtitle"
                >
                    Traditional security perimeters are failing against a new generation of hyper-personalized, AI-generated threats.
                </motion.p>
            </div>

            <motion.div
                className="problem-grid"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
            >
                {problems.map((prob, idx) => (
                    <motion.div key={idx} variants={itemVariants} className="problem-card glass-panel">
                        <div className="icon-wrapper">
                            {prob.icon}
                        </div>
                        <h3>{prob.title}</h3>
                        <p>{prob.desc}</p>
                        <div className="card-glow"></div>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
};

export default ProblemSection;
