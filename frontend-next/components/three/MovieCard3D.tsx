'use client';
import React, { useRef } from 'react';
import Image from 'next/image';

interface Movie {
  id: number;
  title: string;
  poster_url?: string | null;
  genres?: string[];
  match_score?: number;
}

interface MovieCard3DProps {
  movie: Movie;
}

const MovieCard3D: React.FC<MovieCard3DProps> = ({ movie }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    
    // Calculate distance from center of card for rotation
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const rotX = (-y / rect.height) * 15;
    const rotY = (x / rect.width) * 15;
    
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.04)`;
    
    // Draw a radial gradient shine mapping the mouse path
    const shine = card.querySelector('.shine') as HTMLDivElement;
    if (shine) {
      shine.style.background = `radial-gradient(circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(147,197,253,0.3) 0%, transparent 60%)`;
    }
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="movie-card-3d relative w-64 h-96 rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        transition: 'transform 0.1s ease-out, box-shadow 0.3s ease',
      }}
    >
      <Image 
        src={movie.poster_url || '/placeholder-poster.png'} 
        alt={movie.title} 
        fill
        className="object-cover z-0"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      
      {/* Shine overlay tracking mouse */}
      <div 
        className="shine absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Card Info Details */}
      <div className="card-info absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent z-20 transition-transform duration-300 translate-y-2 group-hover:translate-y-0 text-white">
        {movie.match_score && (
          <span className="match-score text-xs font-bold bg-[#10B981] px-2 py-1 rounded-md mb-2 inline-block shadow-sm">
            {movie.match_score}% Neural Match
          </span>
        )}
        <h3 className="display-font text-lg font-semibold leading-tight line-clamp-2">{movie.title}</h3>
        <div className="genre-tags flex flex-wrap gap-2 mt-2">
          {movie.genres?.slice(0, 3).map(g => (
            <span key={g} className="text-[10px] text-gray-200 border border-white/20 rounded bg-white/10 px-1.5 py-0.5">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieCard3D;