import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  HelpCircleIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  BrainIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  InfoIcon,
} from '../Icons';

export function RiskIntelligence({ riskData = [], isRealBackend, isDemo, isLocalOnly, onNavigateToMLStudio }) {
  const shouldReduceMotion = useReducedMotion();
  const [expandedRiskId, setExpandedRiskId] = useState('diabetes'); // default expand diabetes

  const toggleExpand = (id) => {
    setExpandedRiskId(expandedRiskId === id ? null : id);
  };

  const getSeverityStyle = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'elevated risk':
      case 'elevated':
      case 'high':
        return {
          stroke: '#0891B2',
          glow: 'rgba(8, 145, 178, 0.25)',
          badgeClass: 'badge-risk-elevated',
          icon: <AlertTriangleIcon size={14} />,
        };
      case 'moderate risk':
      case 'moderate':
        return {
          stroke: '#D97706',
          glow: 'rgba(217, 119, 6, 0.25)',
          badgeClass: 'badge-risk-moderate',
          icon: <AlertTriangleIcon size={14} />,
        };
      case 'low risk':
      case 'low':
      default:
        return {
          stroke: '#059669',
          glow: 'rgba(5, 150, 105, 0.25)',
          badgeClass: 'badge-risk-low',
          icon: <CheckCircle2Icon size={14} />,
        };
    }
  };

  return (
    <section className="risk-intelligence-section" aria-labelledby="risk-intelligence-title">
      <div className="section-header-compact">
        <div className="section-title-group">
          <div className="section-badge badge-cyan">
            <BrainIcon size={14} />
            <span>Machine Learning Predictive Intelligence</span>
          </div>
          <h2 id="risk-intelligence-title" className="section-heading-sm">
            Multi-Model Disease Risk Estimates &amp; Feature Drivers
          </h2>
        </div>
        <div className="dev-mode-callout">
          <span className="dev-mode-pill">
            <InfoIcon size={12} />
            <span>{isDemo ? 'Demonstration assessment data' : isRealBackend ? 'Saved backend assessments' : isLocalOnly ? 'Browser-only assessment history' : 'No assessment history'}</span>
          </span>
        </div>
      </div>

      <div className="risk-intelligence-grid">
        {riskData.length === 0 && (
          <p className="empty-state-message">No saved risk assessments are available yet.</p>
        )}
        {riskData.map((item) => {
          const isExpanded = expandedRiskId === item.id;
          const style = getSeverityStyle(item.riskTier);
          const radius = 38;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (item.riskPercentage / 100) * circumference;

          return (
            <div
              key={item.id}
              className={`risk-model-card ${isExpanded ? 'card-expanded' : ''}`}
            >
              {/* Card Main Header */}
              <div className="risk-card-main-header">
                <div className="risk-gauge-wrapper">
                  <svg
                    className="risk-radial-svg"
                    width="96"
                    height="96"
                    viewBox="0 0 96 96"
                    aria-hidden="true"
                  >
                    <circle
                      className="risk-track-circle"
                      cx="48"
                      cy="48"
                      r={radius}
                      strokeWidth="7"
                      fill="none"
                    />
                    <motion.circle
                      className="risk-value-circle"
                      cx="48"
                      cy="48"
                      r={radius}
                      strokeWidth="7"
                      stroke={style.stroke}
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.2, ease: 'easeOut' }}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="risk-gauge-number-wrap">
                    <span className="risk-gauge-percentage">{item.riskPercentage}%</span>
                    <span className="risk-gauge-subtext">Estimated</span>
                  </div>
                </div>

                <div className="risk-summary-text-wrap">
                  <div className="risk-title-row">
                    <h3 className="risk-disease-title">{item.disease}</h3>
                    <span className={`risk-tier-badge ${style.badgeClass}`}>
                      {style.icon}
                      <span>{item.riskTier}</span>
                    </span>
                  </div>
                  <p className="risk-summary-desc">{item.summary}</p>
                  <div className="risk-model-meta-row">
                    <span className="risk-model-engine">{item.modelEngine}</span>
                    <span className="risk-specialist-tag">Specialty: {item.specialist}</span>
                  </div>
                </div>
              </div>

              {/* "Why is this risk elevated?" Interactive Trigger */}
              <div className="risk-card-actions-bar">
                <button
                  type="button"
                  className="btn-why-explanation"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`drivers-panel-${item.id}`}
                >
                  <HelpCircleIcon size={15} />
                  <span>{isExpanded ? 'Hide Contributing Factors' : 'Why is this risk estimated at this level?'}</span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRightIcon size={14} />
                  </motion.span>
                </button>

                <button
                  type="button"
                  className="btn-open-ml-studio"
                  onClick={onNavigateToMLStudio}
                >
                  <span>Explore in ML Studio</span>
                  <ArrowRightIcon size={14} />
                </button>
              </div>

              {/* Expandable Feature Drivers Breakdown Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    id={`drivers-panel-${item.id}`}
                    className="risk-drivers-panel"
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="drivers-panel-header">
                      <span className="drivers-title">Biometric Drivers &amp; Attributions</span>
                      <span className="drivers-subtitle">Feature weight contribution to current predictive model</span>
                    </div>

                    <div className="drivers-list">
                      {item.drivers.map((driver, dIdx) => (
                        <div key={dIdx} className={`driver-item driver-${driver.type}`}>
                          <div className="driver-info-row">
                            <span className="driver-name">{driver.factor}</span>
                            <span className={`driver-impact-tag impact-${driver.type}`}>
                              {driver.type === 'positive' ? 'Protective Factor' : `${driver.impact} Impact`}
                            </span>
                          </div>
                          <div className="driver-bar-track">
                            <motion.div
                              className={`driver-bar-fill fill-${driver.type}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${driver.contribution}%` }}
                              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, delay: dIdx * 0.08 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
