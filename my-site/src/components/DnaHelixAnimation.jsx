import { useState, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * DnaHelixAnimation
 * Pure SVG + Mathematical Sine Wave double helix representation of genomic biology.
 * Symbolizes personalized medicine, genomic risk assessment, and clinical biology.
 */
export function DnaHelixAnimation({
  className = '',
  width = 160,
  height = 360,
  pairCount = 14,
  speed = 1,
  colorA = '#06B6D4',
  colorB = '#10B981',
}) {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;

    let animationFrameId;
    let startTime = performance.now();

    const animate = (time) => {
      const elapsed = (time - startTime) / 1000;
      setPhase((elapsed * speed * 2.2) % (Math.PI * 2));
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [shouldReduceMotion, speed]);

  // Generate Base Pairs
  const pairs = [];
  const paddingY = 24;
  const usableHeight = height - paddingY * 2;
  const stepY = usableHeight / (pairCount - 1);
  const amplitude = (width - 40) / 2;
  const centerX = width / 2;

  for (let i = 0; i < pairCount; i++) {
    const y = paddingY + i * stepY;
    const waveAngle = phase + (i / pairCount) * Math.PI * 2.5;

    // 3D perspective projection via sine and cosine
    const sinVal = Math.sin(waveAngle);
    const cosVal = Math.cos(waveAngle);

    const x1 = centerX + sinVal * amplitude;
    const x2 = centerX - sinVal * amplitude;

    // Depth simulation: scale and opacity based on cosine (z-axis)
    const z1 = cosVal; // -1 (back) to 1 (front)
    const z2 = -cosVal;

    const r1 = 3.5 + z1 * 1.5;
    const r2 = 3.5 + z2 * 1.5;

    const opacity1 = 0.4 + (z1 + 1) * 0.3;
    const opacity2 = 0.4 + (z2 + 1) * 0.3;

    // Rung opacity based on average z
    const rungOpacity = 0.2 + (Math.abs(sinVal)) * 0.35;

    pairs.push({
      id: i,
      y,
      x1,
      x2,
      r1,
      r2,
      opacity1,
      opacity2,
      rungOpacity,
      isFrontA: z1 > 0,
      isFrontB: z2 > 0,
    });
  }

  return (
    <div className={`dna-helix-wrapper ${className}`} aria-hidden="true">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="dna-helix-svg"
      >
        <defs>
          {/* Bioluminescent Gradient for Strand A */}
          <linearGradient id="dnaGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>

          {/* Bioluminescent Gradient for Strand B */}
          <linearGradient id="dnaGradB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Rung Bridge Gradient */}
          <linearGradient id="rungGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#CBD5E1" stopOpacity="0.4" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0.8" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="dnaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Hydrogen Bond Rungs */}
        {pairs.map((pair) => (
          <line
            key={`rung-${pair.id}`}
            x1={pair.x1}
            y1={pair.y}
            x2={pair.x2}
            y2={pair.y}
            stroke="url(#rungGrad)"
            strokeWidth="1.5"
            strokeDasharray="2 3"
            opacity={pair.rungOpacity}
          />
        ))}

        {/* 2. Strand A Nodes (Adenine / Thymine Track) */}
        {pairs.map((pair) => (
          <g key={`nodeA-${pair.id}`}>
            {/* Soft Ambient Node Glow */}
            <circle
              cx={pair.x1}
              cy={pair.y}
              r={pair.r1 * 1.6}
              fill={colorA}
              opacity={pair.opacity1 * 0.3}
              filter="url(#dnaGlow)"
            />
            {/* Core Nucleotide Node */}
            <circle
              cx={pair.x1}
              cy={pair.y}
              r={pair.r1}
              fill="url(#dnaGradA)"
              stroke="#FFFFFF"
              strokeWidth="0.75"
              opacity={pair.opacity1}
            />
          </g>
        ))}

        {/* 3. Strand B Nodes (Guanine / Cytosine Track) */}
        {pairs.map((pair) => (
          <g key={`nodeB-${pair.id}`}>
            {/* Soft Ambient Node Glow */}
            <circle
              cx={pair.x2}
              cy={pair.y}
              r={pair.r2 * 1.6}
              fill={colorB}
              opacity={pair.opacity2 * 0.3}
              filter="url(#dnaGlow)"
            />
            {/* Core Nucleotide Node */}
            <circle
              cx={pair.x2}
              cy={pair.y}
              r={pair.r2}
              fill="url(#dnaGradB)"
              stroke="#FFFFFF"
              strokeWidth="0.75"
              opacity={pair.opacity2}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
