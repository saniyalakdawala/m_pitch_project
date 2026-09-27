import React, { useRef, useState } from "react";

/**
 * 3D Interactive Perspective Card with specular glare reflection
 */
export default function Card3D({
  children,
  className = "",
  glowColor = "rgba(0, 163, 224, 0.18)",
  maxTilt = 4,
}) {
  const cardRef = useRef(null);
  const [style, setStyle] = useState({
    transform: "perspective(1200px) rotateX(0deg) rotateY(0deg)",
    transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  function handleMouseMove(e) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;

    const rotX = ((y / rect.height - 0.5) * -maxTilt).toFixed(2);
    const rotY = ((x / rect.width - 0.5) * maxTilt).toFixed(2);

    setStyle({
      transform: `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.008, 1.008, 1.008)`,
      transition: "transform 0.1s ease-out",
    });

    setGlare({
      x: xPct,
      y: yPct,
      opacity: 0.35,
    });
  }

  function handleMouseLeave() {
    setStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
    });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`relative overflow-hidden rounded-2xl marsh-card transition-shadow ${className}`}
    >
      {/* Dynamic Specular 3D Glare */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: glare.opacity,
          background: `radial-gradient(circle 320px at ${glare.x}% ${glare.y}%, ${glowColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
