import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Puzzle, Smartphone, Send, MessageCircle } from 'lucide-react';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero-container">

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                className="hero-title"
            >
                When intelligence reaches out<br />
                <span className="text-gradient">to instinct, the future takes shape</span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="hero-subtitle"
            >
                An unlikely alliance — where human intuition<br />
                and algorithmic precision move as one to stop zero-day threats.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="hero-actions"
            >
                <a href="/browser-extension.zip" download className="btn-primary flex-center" style={{ textDecoration: 'none' }}>
                    <Puzzle size={16} className="mr-2" /> Download Extension
                </a>
                <a href="/app-release.apk" download className="btn-secondary glass-pill flex-center" style={{ textDecoration: 'none' }}>
                    <Smartphone size={16} className="mr-2" /> Download Mobile APK
                </a>
                <a 
                    href="https://t.me/krypton_security_bot" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-secondary glass-pill flex-center" 
                    style={{ textDecoration: 'none' }}
                >
                    <Send size={16} className="mr-2" /> Telegram Bot
                </a>
                <a 
                    href="https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+joy-use&type=phone_number&app_absent=0" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-secondary glass-pill flex-center" 
                    style={{ textDecoration: 'none' }}
                >
                    <MessageCircle size={16} className="mr-2" /> WhatsApp Bot
                </a>
            </motion.div>
        </section>
    );
};

export default Hero;
