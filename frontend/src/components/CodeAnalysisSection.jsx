import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, ContactShadows, Line, Environment } from '@react-three/drei';
import { motion } from 'framer-motion';
import './CodeAnalysisSection.css';

const RubiksCube = () => {
    const group = useRef();
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        group.current.rotation.x = Math.sin(t / 4) * 0.2;
        group.current.rotation.y += 0.002;
    });

    const cubes = useMemo(() => {
        const temp = [];
        const size = 1.05;
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const dist = Math.abs(x) + Math.abs(y) + Math.abs(z);
                    if (dist > 2.5 && Math.random() > 0.4) continue;

                    const isGlass = Math.random() > 0.7;
                    temp.push({
                        key: `${x}-${y}-${z}`,
                        position: [x * size, y * size, z * size],
                        isGlass
                    });
                }
            }
        }
        return temp;
    }, []);

    return (
        <group ref={group} rotation={[0.4, 0.4, 0]}>
            {cubes.map(({ key, position, isGlass }) => (
                <mesh key={key} position={position}>
                    <boxGeometry args={[1, 1, 1]} />
                    {isGlass ? (
                        <meshPhysicalMaterial
                            color="#a855f7"
                            transmission={0.9}
                            opacity={1}
                            transparent
                            roughness={0.1}
                            ior={1.5}
                            thickness={0.5}
                        />
                    ) : (
                        <meshStandardMaterial color="#1f1f22" metalness={0.7} roughness={0.15} />
                    )}
                </mesh>
            ))}
        </group>
    );
};

const FloatingShapes = () => {
    return (
        <>
            <Float speed={2} rotationIntensity={1} floatIntensity={2} position={[-4, 2, -1]}>
                <mesh>
                    <torusGeometry args={[0.3, 0.08, 16, 32]} />
                    <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
                </mesh>
            </Float>
            <Float speed={1.5} rotationIntensity={1.5} floatIntensity={1.5} position={[4, -2, -1]}>
                <mesh>
                    <coneGeometry args={[0.3, 0.6, 32]} />
                    <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
                </mesh>
            </Float>
            <Float speed={2.5} rotationIntensity={1} floatIntensity={3} position={[-3, -3, -2]}>
                <mesh>
                    <icosahedronGeometry args={[0.4, 0]} />
                    <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
                </mesh>
            </Float>
            <Float speed={1} rotationIntensity={2} floatIntensity={2} position={[3, 3, -1]}>
                <mesh>
                    <dodecahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
                </mesh>
            </Float>
        </>
    );
};

const CodePanels = () => {
    return (
        <group>
            {/* Left Panel */}
            <Float speed={2} floatIntensity={1} position={[-4, 1, 0]}>
                <Html transform center scale={0.5} className="html-panel">
                    <div className="code-panel glass-panel">
                        <pre>
                            <code>
                                <span className="text-gray-400">def</span> <span className="text-blue-400">notsecure</span>(atlscure):<br />
                                &nbsp;&nbsp;<span className="text-purple-400">if</span> atlscure:<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;security = <span className="text-orange-400">True</span><br />
                                &nbsp;&nbsp;<span className="text-purple-400">else</span>:<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;security = <span className="text-orange-400">False</span><br />
                                &nbsp;&nbsp;<span className="text-purple-400">return</span> security
                            </code>
                        </pre>
                    </div>
                </Html>
            </Float>
            {/* Right Panel */}
            <Float speed={2.5} floatIntensity={1.5} position={[4, -1, 1]}>
                <Html transform center scale={0.5} className="html-panel">
                    <div className="code-panel glass-panel">
                        <pre>
                            <code>
                                <span className="text-gray-400">def</span> <span className="text-blue-400">*********</span>(*********):<br />
                                &nbsp;&nbsp;<span className="text-purple-400">if</span> *********:<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;********* = <span className="text-orange-400">True</span><br />
                                &nbsp;&nbsp;<span className="text-purple-400">else</span>:<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;********* = <span className="text-orange-400">False</span><br />
                                &nbsp;&nbsp;<span className="text-purple-400">return</span> *********
                            </code>
                        </pre>
                    </div>
                </Html>
            </Float>

            {/* Connecting Lines */}
            {/* Note: In a real app we'd track ref positions dynamically, but static lines look fine for the abstract vibe */}
            <Line points={[[-3, 1, 0], [-1.5, 0.5, 0]]} color="rgba(255,255,255,0.2)" lineWidth={1} />
            <Line points={[[-1.5, 0.5, 0], [-0.5, 0, 0]]} color="rgba(255,255,255,0.2)" lineWidth={1} />

            <Line points={[[3, -1, 1], [1.5, -0.5, 0.5]]} color="rgba(255,255,255,0.2)" lineWidth={1} />
            <Line points={[[1.5, -0.5, 0.5], [0.5, 0, 0]]} color="rgba(255,255,255,0.2)" lineWidth={1} />
        </group>
    );
};

const CodeAnalysisSection = () => {
    return (
        <section className="code-analysis-section" id="deep-analysis">
            <div className="section-header">
                <p className="section-label"><span className="section-label-dot"></span>04 — DEEP ANALYSIS</p>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    Contextual <span className="text-gradient">Code Analysis</span>
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="section-subtitle"
                >
                    Deconstructs payloads in real-time, instantly identifying underlying logic flaws and obfuscated zero-day threat vectors.
                </motion.p>
            </div>

            <div className="canvas-container">
                <Canvas camera={{ position: [0, 0, 14], fov: 40 }} dpr={[1, 2]}>
                    <ambientLight intensity={2.5} />
                    <directionalLight position={[10, 10, 5]} intensity={3} />
                    <spotLight position={[-10, 10, 10]} angle={0.2} penumbra={1} intensity={4} color="#a855f7" />
                    <spotLight position={[10, -10, 10]} angle={0.2} penumbra={1} intensity={4} color="#3b82f6" />

                    <RubiksCube />
                    <FloatingShapes />
                    <CodePanels />

                    <Environment preset="city" />
                    <ContactShadows position={[0, -4.5, 0]} opacity={0.6} scale={20} blur={2} far={4.5} />
                </Canvas>
            </div>
        </section>
    );
};

export default CodeAnalysisSection;
