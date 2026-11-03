import { motion, useReducedMotion } from 'motion/react';
import {
  RefreshCwIcon,
  ShieldCheckIcon,
  InfoIcon,
  CalendarIcon,
  HeartPulseIcon,
  UserIcon,
} from '../Icons';

export function HealthOverview({ patient, isRealBackend, isDemo, isLocalOnly, onRefresh, isRefreshing, onEditProfile }) {
  const shouldReduceMotion = useReducedMotion();
  const name = patient?.name || 'Patient';
  const healthIndex = Number.isFinite(patient?.healthIndex) ? patient.healthIndex : null;
  const healthStatus = patient?.healthStatus || 'No health status is recorded.';
  const healthIndexDetails = patient?.healthIndexDetails;
  const lastAssessment = patient?.lastAssessment;
  const activeCarePlan = patient?.activeCarePlan || 'No active care plan recorded';
  const age = patient?.age;
  const gender = patient?.gender;
  const bloodGroup = patient?.bloodGroup;

  const parsedAssessmentDate = lastAssessment ? new Date(lastAssessment) : null;
  const formattedDate = parsedAssessmentDate && Number.isFinite(parsedAssessmentDate.getTime())
    ? parsedAssessmentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    })
    : 'No assessments recorded';
  const profileDetails = [
    gender || 'Gender not recorded',
    age != null && age !== 'Not recorded' ? `${age}y` : 'Age not recorded',
    bloodGroup || 'Blood group not recorded',
  ].join(' • ');
  const sourceLabel = isDemo ? 'Demo data' : isRealBackend ? 'Live API data' : isLocalOnly ? 'Browser-only data' : 'Data unavailable';

  // Calculate circular stroke for index gauge (radius: 46, circumference: 289)
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = healthIndex == null ? circumference : circumference - (healthIndex / 100) * circumference;

  return (
    <div className="dashboard-hero-card">
      <div className="dashboard-hero-content">
        {/* Left: Patient Greeting & Contextual Intelligence */}
        <div className="dashboard-hero-main">
          <div className="hero-status-strip">
            <span className="hero-patient-badge">
              <span className="live-status-dot" />
              Patient Profile: {name} • {profileDetails}
            </span>
            <div className={`backend-indicator-tag ${isRealBackend ? 'tag-live' : 'tag-dev'}`}>
              <span className="indicator-pulse" />
              <span>{sourceLabel}</span>
            </div>
          </div>

          <div className="hero-greeting-group">
            <h1 className="hero-greeting-title">
              Good morning, <span className="greeting-highlight">{name.split(' ')[0]}</span>
            </h1>
            <p className="hero-greeting-subtitle">
              Your health information and available records are shown below.
            </p>
          </div>

          {/* Active Care Status Banner */}
          <div className="hero-care-plan-banner">
            <div className="care-plan-icon-wrapper">
              <HeartPulseIcon size={20} className="care-plan-icon" />
            </div>
            <div className="care-plan-details">
              <span className="care-plan-label">Active Preventive Focus</span>
              <span className="care-plan-value">{activeCarePlan}</span>
            </div>
          </div>

          {/* Metadata & Quick Action Meta */}
          <div className="hero-meta-strip">
            <div className="hero-timestamp">
              <CalendarIcon size={14} />
              <span>Last Assessment: {formattedDate}</span>
            </div>
            <button
              type="button"
              className="hero-refresh-btn"
              onClick={onEditProfile}
            >
              <UserIcon size={14} />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              className={`hero-refresh-btn ${isRefreshing ? 'btn-refreshing' : ''}`}
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh health metrics"
            >
              <RefreshCwIcon size={14} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
            </button>
          </div>
        </div>

        {/* Right: Circular Overall Health Index Visualizer */}
        <div className="dashboard-hero-gauge-panel">
          <div className="health-index-gauge-container">
            <svg
              className="health-index-svg"
              width="130"
              height="130"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                className="gauge-track"
                cx="60"
                cy="60"
                r={radius}
                strokeWidth="10"
                fill="none"
              />
              <motion.circle
                className="gauge-value-stroke"
                cx="60"
                cy="60"
                r={radius}
                strokeWidth="10"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.4, ease: 'easeOut' }}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="gauge-center-content">
              <span className="gauge-score-number">{healthIndex ?? '—'}</span>
              {healthIndex != null && <span className="gauge-score-scale">/ 100</span>}
              <span className="gauge-score-label">Health Index</span>
            </div>
          </div>

          <div className="health-index-info">
            <div className="health-index-status-pill status-stable">
              <ShieldCheckIcon size={14} />
              <span>{healthStatus}</span>
            </div>
            <p className="health-index-disclaimer">
              <InfoIcon size={12} />
              <span>{healthIndexDetails?.disclaimer || 'No validated health index is available.'}</span>
            </p>
            {healthIndexDetails && (
              <div className="health-index-breakdown">
                <p>{healthIndexDetails.method}</p>
                {healthIndexDetails.components?.length > 0 ? (
                  <ul>
                    {healthIndexDetails.components.map((component) => (
                      <li key={component.name}><span>{component.name}</span><strong>{component.score}/100</strong><small>{component.label}</small></li>
                    ))}
                  </ul>
                ) : <p>{healthIndexDetails.missingInputs?.length ? `Need more data: ${healthIndexDetails.missingInputs.join(', ')}.` : 'No measurements are available.'}</p>}
                {healthIndexDetails.score != null && healthIndexDetails.missingInputs?.length > 0 && (
                  <p>Not included: {healthIndexDetails.missingInputs.join(', ')}.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
