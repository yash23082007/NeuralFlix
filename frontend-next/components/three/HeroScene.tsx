'use client';
import { useState, useEffect } from 'react';
import BackgroundParticles from './BackgroundParticles';

const HeroScene = ({ children }: { children?: React.ReactNode }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      // Calculate normalized mouse positions (-10 to 10 degrees)
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* 3D Particle Field layer */}
      <BackgroundParticles />

      {/* Content wrapper with perspective */}
      <div 
        className="w-full max-w-7xl mx-auto px-4 z-10 flex flex-col lg:flex-row items-center justify-between"
        style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
      >
        {/* Typographical / Info Container */}
        <div className="lg:w-1/2 space-y-6 text-center lg:text-left mb-12 lg:mb-0">
          <h1 className="display-font text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-tight">
            Discover Your Next <br/> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-500">
              Cinematic Journey
            </span>
          </h1>
          <p className="body-font text-lg text-gray-500 max-w-xl mx-auto lg:mx-0">
            Powered by next-generation neural collaborative filtering and transformer engines to map your unique taste DNA.
          </p>
          <div className="flex justify-center lg:justify-start gap-4">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-medium transition shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)]">
              Get Started
            </button>
            <button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-8 py-3 rounded-full font-medium transition shadow-sm">
              Explore Taste DNA
            </button>
          </div>
        </div>

        {/* 3D Parallax Container for Movie Cards */}
        <div 
          className="lg:w-1/2 relative flex justify-center h-[500px]"
          style={{
            transform: `rotateX(${-mousePos.y * 0.3}deg) rotateY(${mousePos.x * 0.3}deg)`,
            transition: 'transform 0.1s ease-out',
            transformStyle: 'preserve-3d',
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
};

export default HeroScene;