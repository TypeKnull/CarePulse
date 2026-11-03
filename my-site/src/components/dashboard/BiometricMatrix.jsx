import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  HeartPulseIcon,
  ActivityIcon,
  DropletIcon,
  ScaleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FlameIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from '../Icons';

export function BiometricMatrix({ biometrics = [] }) {
  const shouldReduceMotion = useReducedMotion();
  const [selectedMetricId, setSelectedMetricId] = useState(null);

  // Fallback if empty
  const metricsList = biometrics.length > 0 ? biometrics : [];

  const getMetricIcon = (id) => {
    switch (id) {
      case 'blood-pressure':
        return <HeartPulseIcon size={20} className="metric-icon-svg icon-bp" />;
      case 'fasting-glucose':
        return <DropletIcon size={20} className="metric-icon-svg icon-glucose" />;
      case 'bmi':
        return <ScaleIcon size={20} className="metric-icon-svg icon-bmi" />;
      case 'total-cholesterol':
        return <ActivityIcon size={20} className="metric-icon-svg icon-cholesterol" />;
      case 'heart-rate':
        return <HeartPulseIcon size={20} className="metric-icon-svg icon-hr" />;
      case 'physical-activity':
        return <FlameIcon size={20} className="metric-icon-svg icon-activity" />;
      default:
        return <ActivityIcon size={20} className="metric-icon-svg" />;
    }
  };

  const getStatusBadge = (status, statusLabel) => {
    switch (status) {
      case 'optimal':
        return (
          <span className="biometric-status-pill status-optimal">
            <CheckCircle2Icon size={12} />
            <span>{statusLabel || 'Optimal'}</span>
          </span>
        );
      case 'borderline':
        return (
          <span className="biometric-status-pill status-borderline">
            <AlertTriangleIcon size={12} />
            <span>{statusLabel || 'Borderline'}</span>
          </span>
        );
      case 'elevated':
        return (
          <span className="biometric-status-pill status-elevated">
            <AlertTriangleIcon size={12} />
            <span>{statusLabel || 'Elevated'}</span>
          </span>
        );
      case 'urgent':
        return (
          <span className="biometric-status-pill status-urgent" role="alert">
            <AlertTriangleIcon size={12} />
            <span>{statusLabel}</span>
          </span>
        );
      case 'recorded':
        return (
          <span className="biometric-status-pill status-recorded">
            <span>{statusLabel || 'Recorded'}</span>
          </span>
        );
      default:
        return (
          <span className="biometric-status-pill status-unrecorded">
            <span>{statusLabel || 'Normal'}</span>
          </span>
        );
    }
  };

  const renderSparkline = (points, status) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 80;
    const height = 28;
    const padding = 3;

    const coordinates = points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const strokeColor =
      status === 'elevated' ? '#0891B2' : status === 'borderline' ? '#D97706' : '#059669';

    return (
      <svg
        className="biometric-sparkline-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coordinates.join(' ')}
        />
        {/* Highlight latest point */}
        {coordinates.length > 0 && (
          <circle
            cx={coordinates[coordinates.length - 1].split(',')[0]}
            cy={coordinates[coordinates.length - 1].split(',')[1]}
            r="3"
            fill={strokeColor}
          />
        )}
      </svg>
    );
  };

  return (
    <section className="biometric-matrix-section" aria-labelledby="biometric-matrix-title">
      <div className="section-header-compact">
        <div className="section-title-group">
          <div className="section-badge badge-primary">
            <ActivityIcon size={14} />
            <span>Biometric Telemetry Matrix</span>
          </div>
          <h2 id="biometric-matrix-title" className="section-heading-sm">
            Clinical Health Indicators &amp; Vital Telemetry
          </h2>
        </div>
        <div className="matrix-legend">
          <span className="legend-item"><span className="legend-dot dot-optimal" /> Optimal</span>
          <span className="legend-item"><span className="legend-dot dot-borderline" /> Borderline</span>
          <span className="legend-item"><span className="legend-dot dot-elevated" /> Elevated</span>
        </div>
      </div>

      <div className="biometric-grid">
        {metricsList.map((item, idx) => {
          const isSelected = selectedMetricId === item.id;
          return (
            <motion.div
              key={item.id}
              className={`biometric-card ${isSelected ? 'card-selected' : ''} card-${item.status}`}
              onClick={() => setSelectedMetricId(isSelected ? null : item.id)}
              whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2 } }}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMetricId(isSelected ? null : item.id);
                }
              }}
              aria-expanded={isSelected}
              aria-label={`${item.name}: ${item.value} ${item.unit}, status ${item.statusLabel}`}
            >
              {/* Card Header: Icon + Category Badge + Sparkline */}
              <div className="biometric-card-top">
                <div className="biometric-icon-wrap">
                  {getMetricIcon(item.id)}
                </div>
                <div className="biometric-sparkline-wrap">
                  {renderSparkline(item.sparkline, item.status)}
                </div>
              </div>

              {/* Metric Title & Value Display */}
              <div className="biometric-card-body">
                <span className="biometric-metric-name">{item.name}</span>
                <div className="biometric-value-row">
                  <span className="biometric-number">{item.value}</span>
                  <span className="biometric-unit">{item.unit}</span>
                </div>
              </div>

              {/* Status Pill & Trend Direction */}
              <div className="biometric-card-footer">
                {getStatusBadge(item.status, item.statusLabel)}
                <div className="biometric-trend-text">
                  {item.trend === 'up' ? (
                    <TrendingUpIcon size={14} className="trend-icon-up" />
                  ) : item.trend === 'down' ? (
                    <TrendingDownIcon size={14} className="trend-icon-down" />
                  ) : (
                    <span className="trend-stable-dash">—</span>
                  )}
                  <span>{item.trendText}</span>
                </div>
              </div>

              {/* Expanded Reference Guide Panel */}
              <div className="biometric-reference-strip">
                <span className="reference-label">Standard Range:</span>
                <span className="reference-value">{item.normalRange}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
