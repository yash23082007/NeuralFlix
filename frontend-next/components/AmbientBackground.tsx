"use client";

export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Primary warm orb */}
      <div
        className="absolute animate-orb-float"
        style={{
          top: "10%",
          left: "15%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(232,168,73,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
          animationDuration: "25s",
        }}
      />
      {/* Rose orb */}
      <div
        className="absolute animate-orb-float"
        style={{
          bottom: "15%",
          right: "10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,99,122,0.03) 0%, transparent 70%)",
          filter: "blur(60px)",
          animationDuration: "30s",
          animationDelay: "-8s",
        }}
      />
      {/* Blue accent orb */}
      <div
        className="absolute animate-orb-float"
        style={{
          top: "50%",
          right: "30%",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,141,239,0.025) 0%, transparent 70%)",
          filter: "blur(60px)",
          animationDuration: "22s",
          animationDelay: "-14s",
        }}
      />
    </div>
  );
}
