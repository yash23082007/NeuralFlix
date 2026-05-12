'use client';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

const BackgroundParticles = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    
    // Add canvas to mounting ref
    mountRef.current.appendChild(renderer.domElement);

    // Create particle system
    const geometry = new THREE.BufferGeometry();
    const count = 1500;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i++) {
        // Distribute particles in a 20x20x20 boundary
        positions[i] = (Math.random() - 0.5) * 20;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x6366F1, // Indigo / Accent Primary
      size: 0.02,
      transparent: true,
      opacity: 0.4,
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = 5;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      
      // Slowly rotate the particle system
      particles.rotation.y += 0.0003;
      particles.rotation.x += 0.0001;
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: -1, 
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh'
      }} 
    />
  );
};

export default BackgroundParticles;