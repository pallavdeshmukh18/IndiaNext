import React, { useState, useEffect } from 'react';
import minimalIllustration from '../assets/minimal-illustration.png';
import minimalFlow from '../assets/minimal-flow.png';
import minimalShield from '../assets/minimal-shield.png';
import '../pages/AuthPages.css';

const carouselData = [
  {
    id: 0,
    image: minimalIllustration,
    title: 'Stop threats\nbefore they spread',
    description: 'Sign in to continue monitoring suspicious activity in real time.',
  },
  {
    id: 1,
    image: minimalFlow,
    title: 'Monitor connected\ndata sources',
    description: 'Keep watch over endpoints, network flow, and remote access logs.',
  },
  {
    id: 2,
    image: minimalShield,
    title: 'Intelligent\nactive defense',
    description: 'Let the automated containment perimeter protect your assets instantly.',
  }
];

const AuthCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 6000); // Change slide every 6 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="auth-left-panel">
      <div className="auth-left-grid"></div>

      {carouselData.map((slide, index) => {
        const isActive = index === currentSlide;
        return (
          <div
            key={slide.id}
            className={`auth-carousel-slide ${isActive ? 'active' : ''}`}
            aria-hidden={!isActive}
          >
            <img 
              src={slide.image} 
              alt={slide.title.replace('\n', ' ')} 
              className="auth-minimal-visual" 
            />
            <div className="auth-hero-text">
              <h1 dangerouslySetInnerHTML={{ __html: slide.title.replace(/\n/g, '<br />') }}></h1>
              <p>{slide.description}</p>
            </div>
          </div>
        );
      })}

      <div className="auth-carousel-indicators">
        {carouselData.map((_, index) => (
          <button
            key={index}
            className={`auth-carousel-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </aside>
  );
};

export default AuthCarousel;
