import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  SparklesIcon,
  CheckIcon,
  FlameIcon,
  DropletIcon,
  StethoscopeIcon,
  ActivityIcon,
  FileTextIcon,
} from '../Icons';

export function PreventiveActionPlan({
  recommendations = [],
  onExportBrief,
}) {
  const shouldReduceMotion = useReducedMotion();
  const [checkedActions, setCheckedActions] = useState({});

  const toggleAction = (idx) => {
    setCheckedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'physical activity':
      case 'activity':
        return <FlameIcon size={18} className="rec-icon icon-cyan" />;
      case 'nutrition':
        return <DropletIcon size={18} className="rec-icon icon-amber" />;
      case 'monitoring':
        return <ActivityIcon size={18} className="rec-icon icon-teal" />;
      case 'clinical follow-up':
      case 'clinical':
      default:
        return <StethoscopeIcon size={18} className="rec-icon icon-blue" />;
    }
  };

  return (
    <div className="preventive-action-plan-card" aria-labelledby="preventive-plan-heading">
      <div className="plan-card-header">
        <div className="plan-header-title-wrap">
          <div className="section-badge badge-teal">
            <SparklesIcon size={14} />
            <span>Personalized Care Guidance</span>
          </div>
          <h4 id="preventive-plan-heading" className="plan-heading">
            Your Preventive Health Focus &amp; Action Plan
          </h4>
          <p className="plan-desc">
            Evidence-informed educational recommendations tailored to your active biometric risk profile and model feature attributions.
          </p>
        </div>

        {onExportBrief && (
          <button
            type="button"
            className="btn-export-consult-brief"
            onClick={onExportBrief}
          >
            <FileTextIcon size={15} />
            <span>Prepare Physician Consultation Brief</span>
          </button>
        )}
      </div>

      {/* Recommendations Cards Grid */}
      <div className="plan-items-grid">
        {recommendations.length === 0 && (
          <p className="prediction-section-empty">No recommendations were returned for this assessment.</p>
        )}
        {recommendations.map((rec, idx) => {
          const isDone = !!checkedActions[idx];

          return (
            <motion.div
              key={idx}
              className={`plan-item-card ${isDone ? 'item-completed' : ''}`}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
            >
              <div className="plan-item-top">
                <div className="plan-cat-badge">
                  {getCategoryIcon(rec.category)}
                  <span className="cat-name">{rec.category || 'Preventive Focus'}</span>
                </div>
                <span className={`plan-urgency-tag tag-${rec.urgency?.toLowerCase() || 'actionable'}`}>
                  {rec.urgency || 'Actionable'}
                </span>
              </div>

              <h5 className="plan-item-title">{rec.title}</h5>
              <p className="plan-item-action">{rec.action}</p>

              <div className="plan-item-footer">
                <button
                  type="button"
                  className={`btn-routine-toggle ${isDone ? 'routine-active' : ''}`}
                  onClick={() => toggleAction(idx)}
                  aria-label={isDone ? 'Mark as active' : 'Add to daily routine'}
                >
                  <span className="routine-checkbox">
                    {isDone ? <CheckIcon size={12} /> : null}
                  </span>
                  <span>{isDone ? 'Reviewed this session' : 'Mark as reviewed'}</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
