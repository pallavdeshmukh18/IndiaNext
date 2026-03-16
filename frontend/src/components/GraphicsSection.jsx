import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import './GraphicsSection.css';
import leftHand from '../assets/images/hand_left.png';
import rightHand from '../assets/images/hand_right.png';
import centerShape from '../assets/images/central_shape.png';

const GraphicsSection = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start center", "end start"]
    });

    const leftHandX = useTransform(scrollYProgress, [0, 1], [0, -200]);
    const rightHandX = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const handsOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);
    const centerScale = useTransform(scrollYProgress, [0, 0.8], [1, 1.2]);
    const centerOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

    return (
        <section className="graphics-container" ref={containerRef}>
            <div className="graphics-hands">
                <motion.div
                    className="hand-wrapper left-hand"
                    style={{ x: leftHandX, opacity: handsOpacity }}
                >
                    <img
                        src={leftHand}
                        alt="Robotic AI hand"
                        className="hand-image"
                    />
                </motion.div>

                <motion.div
                    className="center-glow-container"
                    style={{ scale: centerScale, opacity: centerOpacity }}
                >
                    <img
                        src={centerShape}
                        alt="Central glowing shape"
                        className="center-shape"
                    />
                    <div className="glow-effect"></div>
                </motion.div>

                <motion.div
                    className="hand-wrapper right-hand"
                    style={{ x: rightHandX, opacity: handsOpacity }}
                >
                    <img
                        src={rightHand}
                        alt="Human hand pointing"
                        className="hand-image"
                    />
                </motion.div>
            </div>
        </section>
    );
};

export default GraphicsSection;
