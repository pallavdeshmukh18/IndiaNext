import React from 'react';
import Hero from '../components/Hero';
import GraphicsSection from '../components/GraphicsSection';
import ProblemSection from '../components/ProblemSection';
import WorkflowSection from '../components/WorkflowSection';
import DashboardPreview from '../components/DashboardPreview';
import CodeAnalysisSection from '../components/CodeAnalysisSection';
import ExplainableAISection from '../components/ExplainableAISection';
import FinalCTA from '../components/FinalCTA';

const Landing = () => (
  <>
    <section className="hero-container">
      <Hero />
    </section>
    <GraphicsSection />
    <ProblemSection />
    <WorkflowSection />
    <DashboardPreview />
    <CodeAnalysisSection />
    <ExplainableAISection />
    <FinalCTA />
  </>
);

export default Landing;
