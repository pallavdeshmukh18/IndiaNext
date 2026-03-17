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
                <button className="btn-primary flex-center">
                    <Puzzle size={16} className="mr-2" /> Download Extension
                </button>
                <button className="btn-secondary glass-pill flex-center">
                    <Smartphone size={16} className="mr-2" /> Download Mobile APK
                </button>
                <button className="btn-secondary glass-pill flex-center">
                    <Send size={16} className="mr-2" /> Telegram Bot
                </button>
                <button className="btn-secondary glass-pill flex-center">
                    <MessageCircle size={16} className="mr-2" /> WhatsApp Bot
                </button>
            </motion.div>
        </section>
    );
};

export default Hero;
