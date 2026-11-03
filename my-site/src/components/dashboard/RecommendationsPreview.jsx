import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  SparklesIcon,
  FlameIcon,
  HeartPulseIcon,
  DropletIcon,
  FlaskConicalIcon,
  CheckIcon,
} from '../Icons';

export function RecommendationsPreview({ recommendations = [], onToggle, canPersist = false }) {
  const shouldReduceMotion = useReducedMotion();
  const [savingActionId, setSavingActionId] = useState(null);
  const [actionError, setActionError] = useState('');

  const toggleItem = async (rec) => {
    if (!rec.actionId || !canPersist || savingActionId) return;
    setSavingActionId(rec.actionId);
    setActionError('');
    try {
      await onToggle(rec.actionId, !rec.isCompleted);
    } catch (error) {
      setActionError(error.message || 'Recommendation status could not be saved.');
    } finally {
      setSavingActionId(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'nutrition & diet':
        return <DropletIcon size={16} className="rec-cat-icon icon-amber" />;
      case 'physical activity':
        return <FlameIcon size={16} className="rec-cat-icon icon-cyan" />;
      case 'cardiovascular health':
        return <HeartPulseIcon size={16} className="rec-cat-icon icon-teal" />;
      default:
        return <FlaskConicalIcon size={16} className="rec-cat-icon icon-blue" />;
    }
  };

  return (
    <section className="recommendations-section" aria-labelledby="recommendations-title">
      <div className="section-header-compact">
        <div className="section-title-group">
          <div className="section-badge badge-primary">
            <SparklesIcon size={14} />
            <span>Personalized Care Intelligence</span>
          </div>
          <h2 id="recommendations-title" className="section-heading-sm">
            Biometric-Targeted Preventive Action Plan
          </h2>
        </div>
      </div>

      <div className="recommendations-grid">
        {recommendations.length === 0 && (
          <p className="empty-state-message">No active recommendations are recorded.</p>
        )}
        {actionError && <p className="dashboard-record-error" role="alert">{actionError}</p>}
        {recommendations.map((rec, idx) => {
          const isDone = !!rec.isCompleted;

          return (
            <motion.div
              key={rec.id || idx}
              className={`recommendation-card ${isDone ? 'rec-completed' : ''}`}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
            >
              {/* Linked Metric Causality Bridge */}
              {rec.linkedMetric && rec.linkedRisk && <div className="rec-causality-bridge">
                <span className="rec-trigger-label">Triggered by:</span>
                <span className="rec-trigger-pill">{rec.linkedMetric}</span>
                <span className="rec-arrow-separator">→</span>
                <span className="rec-risk-pill">{rec.linkedRisk}</span>
              </div>}

              {/* Card Header: Category & Urgency */}
              <div className="rec-card-header">
                <div className="rec-category-wrap">
                  {getCategoryIcon(rec.category)}
                  <span className="rec-category-text">{rec.category}</span>
                </div>
                <div className="rec-category-wrap">
                  <span className={`rec-urgency-tag urgency-${rec.urgencyColor || 'cyan'}`}>{rec.urgency}</span>
                  <span className="rec-status-tag">{rec.status || (isDone ? 'Completed' : 'Active')}</span>
                </div>
              </div>

              {/* Recommendation Title & Clinical Rationale */}
              <h3 className="rec-title">{rec.title}</h3>
              {rec.source && <p className="rec-source-label">Source: {rec.source}</p>}
              <p className="rec-action-text">{rec.action}</p>

              {/* Expected Clinical Impact */}
              {rec.impactMetric && (
                <div className="rec-impact-banner">
                  <span className="impact-indicator-dot" />
                  <span className="impact-text">{rec.impactMetric}</span>
                </div>
              )}

              {/* Action Toggle Button */}
              <div className="rec-card-footer">
                <button
                  type="button"
                  className={`rec-check-btn ${isDone ? 'btn-done' : ''}`}
                  onClick={() => toggleItem(rec)}
                  disabled={!canPersist || !rec.actionId || savingActionId === rec.actionId}
                  aria-label={isDone ? 'Mark as active' : 'Mark as integrated into routine'}
                >
                  <span className="checkbox-visual">
                    {isDone ? <CheckIcon size={13} /> : null}
                  </span>
                  <span>{savingActionId === rec.actionId ? 'Saving…' : isDone ? 'Mark active' : !canPersist || !rec.actionId ? 'Completion unavailable for this record' : 'Mark complete'}</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
