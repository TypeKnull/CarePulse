import { useState } from 'react';
import {
  ActivityIcon,
  HeartPulseIcon,
  DropletIcon,
  ScaleIcon,
} from '../Icons';

export function HealthTrendChart({ trendData = {} }) {
  const [selectedMetric, setSelectedMetric] = useState('blood-pressure');
  const [timeRange, setTimeRange] = useState('6M');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const metricTabs = [
    { id: 'blood-pressure', label: 'Blood Pressure', icon: <HeartPulseIcon size={16} /> },
    { id: 'fasting-glucose', label: 'Blood Glucose', icon: <DropletIcon size={16} /> },
    { id: 'bmi', label: 'BMI', icon: <ScaleIcon size={16} /> },
    { id: 'total-cholesterol', label: 'Total Cholesterol', icon: <ActivityIcon size={16} /> },
  ];

  const currentDataset = trendData[selectedMetric] || {};
  const currentPoints = currentDataset.timeRanges?.[timeRange] || [];
  const unit = currentDataset.unit || '';
  const normalRange = currentDataset.normalRange || { min: 0, max: 100, label: 'Normal Range' };

  // Calculate SVG Chart Dimensions & Coordinates
  const chartWidth = 720;
  const chartHeight = 240;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Determine Y Min & Max
  let yMin = 0;
  let yMax = 100;

  if (selectedMetric === 'blood-pressure') {
    const allVals = currentPoints.flatMap((p) => [p.systolic, p.diastolic].filter((value) => value != null));
    const rawMin = Math.min(...(allVals.length ? allVals : [70]));
    const rawMax = Math.max(...(allVals.length ? allVals : [140]));
    yMin = Math.floor((rawMin - 15) / 10) * 10;
    yMax = Math.ceil((rawMax + 15) / 10) * 10;
  } else {
    const allVals = currentPoints.map((p) => p.value).filter((value) => value != null);
    const rawMin = Math.min(...(allVals.length ? allVals : [0]));
    const rawMax = Math.max(...(allVals.length ? allVals : [100]));
    const buffer = (rawMax - rawMin) * 0.25 || 10;
    yMin = Math.max(0, Math.floor(rawMin - buffer));
    yMax = Math.ceil(rawMax + buffer);
  }

  const getYCoord = (val) => {
    if (yMax === yMin) return paddingTop + innerHeight / 2;
    return paddingTop + innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight;
  };

  const getXCoord = (idx) => {
    if (currentPoints.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (idx / (currentPoints.length - 1)) * innerWidth;
  };

  // Generate smooth SVG paths
  const generatePath = (valKey) => {
    if (currentPoints.length < 2) return '';
    return currentPoints
      .map((p, idx) => {
        const x = getXCoord(idx);
        const y = getYCoord(p[valKey]);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const generateAreaPath = (valKey) => {
    if (currentPoints.length < 2) return '';
    const linePath = currentPoints
      .map((p, idx) => {
        const x = getXCoord(idx);
        const y = getYCoord(p[valKey]);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const lastX = getXCoord(currentPoints.length - 1);
    const firstX = getXCoord(0);
    const bottomY = paddingTop + innerHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Stats calculation
  let avgVal = '—';
  let peakVal = '—';
  let minVal = '—';

  if (selectedMetric === 'blood-pressure' && currentPoints.length > 0) {
    const sysVals = currentPoints.map((p) => p.systolic);
    const diaVals = currentPoints.map((p) => p.diastolic);
    avgVal = `${Math.round(sysVals.reduce((a, b) => a + b, 0) / sysVals.length)} / ${Math.round(diaVals.reduce((a, b) => a + b, 0) / diaVals.length)}`;
    peakVal = `${Math.max(...sysVals)} / ${Math.max(...diaVals)}`;
    minVal = `${Math.min(...sysVals)} / ${Math.min(...diaVals)}`;
  } else if (currentPoints.length > 0) {
    const vals = currentPoints.map((p) => p.value);
    avgVal = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    peakVal = Math.max(...vals).toString();
    minVal = Math.min(...vals).toString();
  }

  // Normal zone band Y bounds
  const normYTop = getYCoord(normalRange.max || yMax);
  const normYBottom = getYCoord(normalRange.min || yMin);
  const normBandHeight = Math.max(0, normYBottom - normYTop);

  return (
    <section className="health-trend-section" aria-labelledby="health-trend-title">
      <div className="section-header-compact">
        <div className="section-title-group">
          <div className="section-badge badge-teal">
            <ActivityIcon size={14} />
            <span>Longitudinal Health Journey</span>
          </div>
          <h2 id="health-trend-title" className="section-heading-sm">
            Biometric Trend Trajectory &amp; Reference Ranges
          </h2>
        </div>

        {/* Time Range Selector */}
        <div className="time-range-toggle" role="group" aria-label="Select chart timeframe">
          <button
            type="button"
            className={`time-toggle-btn ${timeRange === '6M' ? 'active' : ''}`}
            onClick={() => setTimeRange('6M')}
          >
            6 Months
          </button>
          <button
            type="button"
            className={`time-toggle-btn ${timeRange === '1Y' ? 'active' : ''}`}
            onClick={() => setTimeRange('1Y')}
          >
            1 Year
          </button>
        </div>
      </div>

      {/* Metric Selector Tabs */}
      <div className="trend-metric-tabs" role="tablist" aria-label="Select metric to plot">
        {metricTabs.map((tab) => {
          const isActive = selectedMetric === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`metric-tab-btn ${isActive ? 'tab-active' : ''}`}
              onClick={() => {
                setSelectedMetric(tab.id);
                setHoveredPoint(null);
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SVG Chart Surface */}
      <div className="trend-chart-card">
        <div className="chart-meta-row">
          <span className="chart-metric-title">{currentDataset.metric || metricTabs.find((tab) => tab.id === selectedMetric)?.label}</span>
          <div className="chart-reference-badge">
            <span className="reference-band-indicator" />
            <span>{normalRange.label}</span>
          </div>
        </div>

        <div className="chart-svg-container">
          {currentPoints.length === 0 ? (
            <p className="chart-empty-state">No timestamped measurements are recorded for this metric in the selected period.</p>
          ) : <svg
            className="trend-svg"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0891B2" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0891B2" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradient-norm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Shaded Clinical Normal Range Band */}
            {normBandHeight > 0 && (
              <rect
                x={paddingLeft}
                y={normYTop}
                width={innerWidth}
                height={normBandHeight}
                fill="url(#gradient-norm)"
                rx="4"
              />
            )}

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = paddingTop + innerHeight * pct;
              const val = Math.round(yMax - pct * (yMax - yMin));
              return (
                <g key={i} className="chart-grid-row">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="chart-axis-label"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Plotted Paths & Points for Blood Pressure (Dual) or Single Metric */}
            {selectedMetric === 'blood-pressure' ? (
              <>
                {/* Systolic Area & Line */}
                <path d={generateAreaPath('systolic')} fill="url(#gradient-area)" />
                <path
                  d={generatePath('systolic')}
                  fill="none"
                  stroke="#0891B2"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                {/* Diastolic Line */}
                <path
                  d={generatePath('diastolic')}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeDasharray="5 3"
                />

                {/* Data Points */}
                {currentPoints.map((p, idx) => {
                  const x = getXCoord(idx);
                  const ySys = getYCoord(p.systolic);
                  const isHovered = hoveredPoint?.idx === idx;

                  return (
                    <g
                      key={idx}
                      className="chart-point-group"
                      onMouseEnter={() => setHoveredPoint({ ...p, idx, x, y: ySys })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <circle
                        cx={x}
                        cy={ySys}
                        r={isHovered ? 6 : 4}
                        fill="#0891B2"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="interactive-node"
                      />
                      <circle
                        cx={x}
                        cy={getYCoord(p.diastolic)}
                        r={isHovered ? 5 : 3.5}
                        fill="#059669"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="interactive-node"
                      />
                    </g>
                  );
                })}
              </>
            ) : (
              <>
                {/* Single Value Area & Line */}
                <path d={generateAreaPath('value')} fill="url(#gradient-area)" />
                <path
                  d={generatePath('value')}
                  fill="none"
                  stroke="#0891B2"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                {/* Data Points */}
                {currentPoints.map((p, idx) => {
                  const x = getXCoord(idx);
                  const y = getYCoord(p.value);
                  const isHovered = hoveredPoint?.idx === idx;

                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={isHovered ? 6.5 : 4.5}
                      fill="#0891B2"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="interactive-node"
                      onMouseEnter={() => setHoveredPoint({ ...p, idx, x, y })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  );
                })}
              </>
            )}

            {/* X-Axis Labels */}
            {currentPoints.map((p, idx) => {
              const x = getXCoord(idx);
              return (
                <text
                  key={idx}
                  x={x}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  className="chart-axis-label-x"
                >
                  {p.label}
                </text>
              );
            })}
          </svg>}

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="chart-floating-tooltip"
              style={{
                left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                top: `${(hoveredPoint.y / chartHeight) * 100}%`,
              }}
            >
              <div className="tooltip-header">
                <span className="tooltip-date">{hoveredPoint.label}</span>
                <span className="tooltip-value">
                  {selectedMetric === 'blood-pressure'
                    ? `${hoveredPoint.systolic} / ${hoveredPoint.diastolic} ${unit}`
                    : `${hoveredPoint.value} ${unit}`}
                </span>
              </div>
              {hoveredPoint.note && (
                <span className="tooltip-note">{hoveredPoint.note}</span>
              )}
            </div>
          )}
        </div>

        {/* Longitudinal Trajectory Summary Strip */}
        <div className="trend-summary-strip">
          <div className="trend-stat-item">
            <span className="trend-stat-label">Interval Average</span>
            <span className="trend-stat-value">{avgVal} <span className="stat-unit">{unit}</span></span>
          </div>
          <div className="trend-stat-item">
            <span className="trend-stat-label">Peak Recorded</span>
            <span className="trend-stat-value">{peakVal} <span className="stat-unit">{unit}</span></span>
          </div>
          <div className="trend-stat-item">
            <span className="trend-stat-label">Lowest Recorded</span>
            <span className="trend-stat-value">{minVal} <span className="stat-unit">{unit}</span></span>
          </div>
          <div className="trend-stat-item">
            <span className="trend-stat-label">Baseline Tracking</span>
            <span className="trend-stat-status status-monitored">
              <span className="mini-pulse-dot" /> {currentPoints.length ? 'Saved measurements shown' : 'No records in this period'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
