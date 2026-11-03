import { motion, useReducedMotion } from 'motion/react';
import {
  BrainIcon,
  HeartPulseIcon,
  ActivityIcon,
  InfoIcon,
  CheckCircle2Icon,
} from '../Icons';

export function DiseaseSelector({
  models = [],
  selectedModelId = 'diabetes',
  onSelectModel,
  disabled = false,
}) {
  const shouldReduceMotion = useReducedMotion();

  const getModelIcon = (id) => {
    switch (id) {
      case 'diabetes':
        return <BrainIcon size={22} className="model-select-icon icon-cyan" />;
      case 'cardiovascular':
        return <HeartPulseIcon size={22} className="model-select-icon icon-teal" />;
      case 'hypertension':
        return <ActivityIcon size={22} className="model-select-icon icon-blue" />;
      default:
        return <BrainIcon size={22} className="model-select-icon" />;
    }
  };

  return (
    <div className="disease-selector-container" role="region" aria-labelledby="selector-heading">
      <div className="selector-header">
        <div className="selector-badge">
          <BrainIcon size={14} />
          <span>Predictive Model Architecture</span>
        </div>
        <h3 id="selector-heading" className="selector-title">
          Select Clinical Target Model
        </h3>
        <p className="selector-subtitle">
          Select a condition to see its relevant inputs and run a prototype risk assessment.
        </p>
      </div>

      <div className="model-cards-grid" role="radiogroup" aria-label="Select Disease Prediction Model">
        {models.map((model) => {
          const isSelected = selectedModelId === model.id;

          return (
            <motion.button
              key={model.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              className={`model-card-btn ${isSelected ? 'model-card-active' : ''} card-${model.badgeColor}`}
              onClick={() => onSelectModel(model.id)}
              whileHover={shouldReduceMotion || disabled ? {} : { y: -3, scale: 1.01 }}
              whileTap={shouldReduceMotion || disabled ? {} : { scale: 0.99 }}
              transition={{ duration: 0.2 }}
            >
              {/* Active Selection Pip */}
              <div className="model-card-top-row">
                <div className="model-icon-bubble">
                  {getModelIcon(model.id)}
                </div>
                <div className="model-selection-pip">
                  {isSelected ? (
                    <span className="active-pip-badge">
                      <CheckCircle2Icon size={14} />
                      <span>Active Model</span>
                    </span>
                  ) : (
                    <span className="inactive-pip-circle" />
                  )}
                </div>
              </div>

              {/* Model Title & Algorithm Class */}
              <div className="model-card-main">
                <h4 className="model-title">{model.title}</h4>
                <span className="model-subtitle">{model.subtitle}</span>
                <span className="model-algorithm-tag">{model.modelType}</span>
              </div>

              {/* Evaluation Scope Description */}
              <p className="model-scope-desc">{model.scope}</p>

              {/* Biomarkers Evaluated List */}
              <div className="model-biomarkers-preview">
                <span className="biomarkers-heading">Key Biomarkers:</span>
                <div className="biomarkers-tag-list">
                  {model.relevantMeasurements?.slice(0, 3).map((meas, mIdx) => (
                    <span key={mIdx} className="biomarker-mini-pill">
                      {meas.split('(')[0].trim()}
                    </span>
                  ))}
                  {model.relevantMeasurements?.length > 3 && (
                    <span className="biomarker-more-pill">
                      +{model.relevantMeasurements.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Model Disclaimer */}
              <div className="model-card-disclaimer">
                <InfoIcon size={12} />
                <span>{model.disclaimer}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
