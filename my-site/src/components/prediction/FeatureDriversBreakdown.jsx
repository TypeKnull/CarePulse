import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BrainIcon,
  InfoIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from '../Icons';

export function FeatureDriversBreakdown({ featureContributions = [] }) {
  const shouldReduceMotion = useReducedMotion();
  const [filterType, setFilterType] = useState('all');

  const filteredContributions = featureContributions.filter((f) => {
    if (filterType === 'all') return true;
    if (filterType === 'adverse') return f.type === 'adverse';
    if (filterType === 'positive') return ['positive', 'beneficial', 'protective', 'optimal'].includes(f.type?.toLowerCase());
    return true;
  });

  return (
    <div className="feature-drivers-breakdown-card" aria-labelledby="drivers-breakdown-heading">
      {/* Section Header */}
      <div className="drivers-card-header">
        <div className="drivers-header-left">
          <div className="section-badge badge-cyan">
            <BrainIcon size={14} />
            <span>Feature Attribution Intelligence</span>
          </div>
          <h4 id="drivers-breakdown-heading" className="drivers-heading">
            Input indicators associated with this estimate
          </h4>
          <p className="drivers-desc">
            The backend supplies rule-based indicator scores for selected inputs. These are not independently validated explanations of the model’s decisions.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="drivers-filter-pill-group" role="group" aria-label="Filter feature contributions">
          <button
            type="button"
            className={`filter-pill-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Features ({featureContributions.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterType === 'adverse' ? 'active' : ''}`}
            onClick={() => setFilterType('adverse')}
          >
            Adverse Drivers
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterType === 'positive' ? 'active' : ''}`}
            onClick={() => setFilterType('positive')}
          >
            Protective Factors
          </button>
        </div>
      </div>

      {/* Feature Contributions List */}
      <div className="feature-contributions-list">
        {filteredContributions.length === 0 && (
          <p className="prediction-section-empty">No indicator details were returned for this assessment.</p>
        )}
        {filteredContributions.map((feature, idx) => {
          const isPositive = ['positive', 'beneficial', 'protective', 'optimal'].includes(feature.type?.toLowerCase());
          const indicatorScore = Number.isFinite(Number(feature.contribution))
            ? Math.max(0, Math.min(100, Number(feature.contribution)))
            : 0;

          return (
            <motion.div
              key={idx}
              className={`feature-item-box ${isPositive ? 'item-protective' : 'item-adverse'}`}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              {/* Top Row: Factor Name & Value + Impact Badge */}
              <div className="feature-item-header">
                <div className="feature-name-group">
                  <span className="feature-factor-name">{feature.factor}</span>
                  <span className="feature-submitted-value">({feature.value})</span>
                </div>

                <div className="feature-impact-badge">
                  {isPositive ? (
                    <span className="badge-impact-positive">
                      <CheckCircle2Icon size={12} />
                      <span>Protective Factor</span>
                    </span>
                  ) : (
                    <span className={`badge-impact-${feature.impact?.toLowerCase() || 'mod'}`}>
                      <AlertTriangleIcon size={12} />
                      <span>{feature.impact} Model Contribution</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Relative Weight Bar Visualizer */}
              <div className="feature-bar-container">
                <div className="feature-bar-track">
                  <motion.div
                    className={`feature-bar-fill ${isPositive ? 'fill-protective' : 'fill-elevated'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${indicatorScore}%` }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.9, delay: idx * 0.07 }}
                  />
                </div>
                <span className="feature-weight-pct">{indicatorScore} indicator score</span>
              </div>

              {/* Rationale Explanation */}
              {feature.rationale && (
                <p className="feature-rationale-text">{feature.rationale}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="feature-disclaimer-note">
        <InfoIcon size={13} />
        <span>Indicator scores are heuristic UI values, not model weights, causal effects, or validated clinical explanations.</span>
      </div>
    </div>
  );
}
