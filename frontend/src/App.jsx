import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GraphicsSection from './components/GraphicsSection';
import ProblemSection from './components/ProblemSection';
import WorkflowSection from './components/WorkflowSection';
import DashboardPreview from './components/DashboardPreview';
import CodeAnalysisSection from './components/CodeAnalysisSection';
import ExplainableAISection from './components/ExplainableAISection';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <div className="hero-zone">
          <Hero />
          <GraphicsSection />
          <div className="scroll-hint"><span className="scroll-hint-dot" /></div>
        </div>
        <ProblemSection />
        <WorkflowSection />
        <DashboardPreview />
        <CodeAnalysisSection />
        <ExplainableAISection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
