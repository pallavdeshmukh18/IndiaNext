import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ onComplete, onFadeStart }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2.8 seconds
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
      if (onFadeStart) onFadeStart();
    }, 2800);

    // Completely remove component after fade out animation (3.8 seconds total)
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 3800);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete, onFadeStart]);

  if (!isVisible) return null;

  return (
    <div className={`loading-screen ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="loading-container">
        {/* Abstract background grid lines */}
        <div className="grid-bg"></div>

        {/* Central scanner box */}
        <div className="scanner-box">
          <div className="scanner-corner top-left"></div>
          <div className="scanner-corner top-right"></div>
          <div className="scanner-corner bottom-left"></div>
          <div className="scanner-corner bottom-right"></div>

          {/* Abstract geometric lines behind text */}
          <div className="geo-lines top"></div>
          <div className="geo-lines bottom"></div>

          {/* Glowing text container */}
          <div className="text-glow-wrapper">
            <h1 className="logo-text">
              Krypt<span className="ai-highlight">on</span>
            </h1>
            {/* The sweeping scanner light effect */}
            <div className="scanner-light"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
