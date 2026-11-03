import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheckIcon,
  CalendarIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  RotateCcwIcon,
  StethoscopeIcon,
} from '../Icons';

export function PredictionResultPanel({
  result = {},
  onReset,
  onSaveToRecords,
  isSaved = false,
}) {
  const shouldReduceMotion = useReducedMotion();
  const {
    diseaseTitle,
    riskScore,
    riskCategory,
    modelVersion,
    suggestedSpecialist,
    assessmentId,
    assessedAt,
    isRealBackend = false,
  } = result;

  const resultDate = assessedAt ? new Date(assessedAt) : null;
  const formattedDate = resultDate && !Number.isNaN(resultDate.getTime())
    ? resultDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Time unavailable';
  const hasRiskScore = typeof riskScore === 'number' && Number.isFinite(riskScore);

  const getTierTheme = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'elevated risk':
      case 'elevated':
      case 'high':
      case 'high risk':
        return {
          stroke: '#0891B2',
          pillClass: 'pill-elevated',
          icon: <AlertTriangleIcon size={16} />,
          badgeLabel: 'Elevated Risk Estimate',
        };
      case 'moderate risk':
      case 'moderate':
      case 'moderate / borderline':
        return {
          stroke: '#D97706',
          pillClass: 'pill-moderate',
          icon: <AlertTriangleIcon size={16} />,
          badgeLabel: 'Moderate Risk Estimate',
        };
      case 'low risk':
      case 'low':
        return {
          stroke: '#059669',
          pillClass: 'pill-low',
          icon: <CheckCircle2Icon size={16} />,
          badgeLabel: 'Low Risk Baseline',
        };
      default:
        return {
          stroke: '#64748B',
          pillClass: 'pill-neutral',
          icon: <ShieldCheckIcon size={16} />,
          badgeLabel: 'Risk category unavailable',
        };
    }
  };

  const theme = getTierTheme(riskCategory || '');
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const safeScore = hasRiskScore ? Math.max(0, Math.min(100, riskScore)) : 0;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="prediction-result-panel" role="region" aria-labelledby="result-heading">
      {/* Top Banner: Backend Status & Assessment ID */}
      <div className="result-top-banner">
        <div className="result-id-group">
          <span className="result-id-label">Assessment ID:</span>
          <span className="result-id-code">{assessmentId || 'Session result'}</span>
        </div>
        <div className={`result-backend-badge ${isRealBackend ? 'badge-live' : 'badge-dev'}`}>
          <span className="badge-pulse-dot" />
          <span>{isRealBackend ? 'Flask model response' : 'Local development estimate'}</span>
        </div>
      </div>

      {/* Main Result Display Layout */}
      <div className="result-main-layout">
        {/* Left: Animated Radial Gauge */}
        <div className="result-gauge-column">
          <div className="result-radial-container">
            <svg
              className="result-svg-gauge"
              width="150"
              height="150"
              viewBox="0 0 140 140"
              aria-hidden="true"
            >
              <circle
                className="result-gauge-track"
                cx="70"
                cy="70"
                r={radius}
                strokeWidth="11"
                fill="none"
              />
              <motion.circle
                className="result-gauge-stroke"
                cx="70"
                cy="70"
                r={radius}
                strokeWidth="11"
                stroke={theme.stroke}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.3, ease: 'easeOut' }}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="result-gauge-center">
              <span className="result-score-val">{hasRiskScore ? `${riskScore}%` : '—'}</span>
              <span className="result-score-tag">Risk estimate</span>
            </div>
          </div>
        </div>

        {/* Right: Risk Interpretation & Clinical Details */}
        <div className="result-details-column">
          <div className="result-title-row">
            <div className="result-heading-wrap">
              <span className="result-pre-title">Predictive Risk Assessment</span>
              <h3 id="result-heading" className="result-disease-title">{diseaseTitle || 'Assessment result'}</h3>
            </div>
            <div className={`result-category-pill ${theme.pillClass}`}>
              {theme.icon}
              <span>{riskCategory || 'Category unavailable'}</span>
            </div>
          </div>

          <p className="result-explanation-p">
            {hasRiskScore ? <>The selected inputs produced a prototype risk estimate of <strong>{riskScore}%</strong>. This is an informational estimate, not a diagnosis or a measure of validated clinical probability.</> : 'The response did not include a valid risk score.'}
          </p>

          <div className="result-metadata-grid">
            <div className="result-meta-item">
              <span className="meta-k">Model Pipeline</span>
              <span className="meta-v">{modelVersion || 'Model details unavailable'}</span>
            </div>
            <div className="result-meta-item">
              <span className="meta-k">Suggested Specialty</span>
              <span className="meta-v specialist-v">
                <StethoscopeIcon size={14} />
                <span>{suggestedSpecialist || 'Discuss with a qualified clinician'}</span>
              </span>
            </div>
            <div className="result-meta-item">
              <span className="meta-k">Timestamp</span>
              <span className="meta-v date-v">
                <CalendarIcon size={13} />
                <span>{formattedDate}</span>
              </span>
            </div>
          </div>

          <div className="result-actions-strip">
            <button
              type="button"
              className="btn-re-evaluate"
              onClick={onReset}
            >
              <RotateCcwIcon size={14} />
              <span>Modify Biometric Inputs</span>
            </button>

            <button
              type="button"
              className={`btn-save-record ${isSaved ? 'btn-saved-done' : ''}`}
              onClick={onSaveToRecords}
              disabled={isSaved}
            >
              <CheckCircle2Icon size={15} />
              <span>{isSaved ? 'Saved in this browser' : 'Save in this browser'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-Diagnostic Safety Callout */}
      <div className="result-clinical-disclaimer">
        <ShieldCheckIcon size={16} className="disclaimer-icon" />
        <p className="disclaimer-text">
          <strong>Prototype assessment:</strong> Values shown depend on the selected inputs and the result source above. They are not a medical diagnosis or validated clinical decision. Consult a licensed healthcare professional for clinical decisions.
        </p>
      </div>
    </div>
  );
}
