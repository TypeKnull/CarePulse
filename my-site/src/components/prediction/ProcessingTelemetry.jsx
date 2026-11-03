import { motion, useReducedMotion } from 'motion/react';
import {
  BrainIcon,
  ShieldCheckIcon,
} from '../Icons';

export function ProcessingTelemetry({ diseaseTitle = 'Type-2 Diabetes Risk' }) {
  const shouldReduceMotion = useReducedMotion();

  const stages = [
    { label: 'Preparing selected inputs', sub: 'Using the values shown in the assessment form' },
    { label: 'Running the selected estimator', sub: 'Requesting an estimate from the configured service' },
    { label: 'Preparing result details', sub: 'Organizing the score and returned indicators' },
    { label: 'Reviewing next steps', sub: 'Displaying educational recommendations when provided' },
  ];

  return (
    <div className="processing-telemetry-container" role="status" aria-live="polite">
      <div className="telemetry-inner-card">
        {/* Animated Central Bio-Core */}
        <div className="processing-bio-core">
          <div className="pulse-aura" />
          <div className="core-icon-wrap">
            <BrainIcon size={32} className="core-brain-svg" />
          </div>
        </div>

        <div className="processing-header">
          <span className="processing-pill">
            <span className="mini-pulse-dot" /> Assessment in progress
          </span>
          <h3 className="processing-title">Evaluating {diseaseTitle}</h3>
          <p className="processing-desc">
            Waiting for the selected prediction service to return an estimate.
          </p>
        </div>

        {/* Pipeline Steps Flow */}
        <div className="telemetry-pipeline-stages">
          {stages.map((stage, idx) => (
            <motion.div
              key={idx}
              className="pipeline-stage-item"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.18, duration: 0.35 }}
            >
              <div className="stage-node-indicator">
                <span className="stage-number">{idx + 1}</span>
                {idx < stages.length - 1 && <span className="stage-connector-line" />}
              </div>
              <div className="stage-content">
                <span className="stage-label">{stage.label}</span>
                <span className="stage-sub">{stage.sub}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="processing-disclaimer-strip">
          <ShieldCheckIcon size={14} />
          <span>Informational model inference. Output represents statistical risk estimate. Non-diagnostic.</span>
        </div>
      </div>
    </div>
  );
}
