import { useReducedMotion } from 'motion/react';

export function BioGridBackground() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="bio-background-container" aria-hidden="true">
      {/* Soft Ambient Biological Light Fields */}
      <div className="bio-light-orb bio-orb-primary" />
      <div className="bio-light-orb bio-orb-secondary" />
      <div className="bio-light-orb bio-orb-tertiary" />
      <div className="bio-light-orb bio-orb-quaternary" />

      {/* Subtle Microscopic Cellular Mesh Pattern */}
      <svg className="bio-cellular-mesh" width="100%" height="100%">
        <defs>
          <pattern id="bio-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            {/* Center Nucleus Dot */}
            <circle cx="28" cy="28" r="1.5" fill="rgba(6, 182, 212, 0.18)" />
            {/* Hexagonal Lattice Membrane Lines */}
            <path
              d="M 28 0 L 56 16 L 56 40 L 28 56 L 0 40 L 0 16 Z"
              fill="none"
              stroke="rgba(8, 145, 178, 0.035)"
              strokeWidth="0.8"
            />
            {/* Secondary Organelle Micro-dots */}
            <circle cx="0" cy="16" r="0.8" fill="rgba(8, 145, 178, 0.12)" />
            <circle cx="56" cy="16" r="0.8" fill="rgba(8, 145, 178, 0.12)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bio-grid)" />
      </svg>

      {/* Ambient Floating Cellular Micro-Nodes (Disabled on Reduced Motion) */}
      {!shouldReduceMotion && (
        <div className="bio-floating-particles">
          <span className="bio-node node-1" />
          <span className="bio-node node-2" />
          <span className="bio-node node-3" />
          <span className="bio-node node-4" />
          <span className="bio-node node-5" />
          <span className="bio-node node-6" />
          <span className="bio-node node-7" />
          <span className="bio-node node-8" />
        </div>
      )}
    </div>
  );
}

