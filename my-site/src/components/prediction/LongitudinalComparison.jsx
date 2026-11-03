import {
  HistoryIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
} from '../Icons';

export function LongitudinalComparison({
  previousAssessment = {},
  currentScore,
}) {
  if (!previousAssessment || previousAssessment.riskScore == null || currentScore == null) {
    return (
      <div className="longitudinal-comparison-card comparison-empty-state" aria-labelledby="longitudinal-heading">
        <div className="comparison-header">
          <div className="section-badge badge-blue">
            <HistoryIcon size={14} />
            <span>Assessment history</span>
          </div>
          <h4 id="longitudinal-heading" className="comparison-title">No previous assessment available</h4>
          <p className="comparison-desc">A comparison will appear when a prior assessment is provided.</p>
        </div>
      </div>
    );
  }

  const {
    riskScore: prevScore,
    riskCategory: prevCategory,
    assessedAt: prevDate,
    deltaPercentagePoints,
    changedFeatures = [],
  } = previousAssessment;

  const parsedPrevDate = prevDate ? new Date(prevDate) : null;
  const formattedPrevDate = parsedPrevDate && !Number.isNaN(parsedPrevDate.getTime()) ? parsedPrevDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) : 'Date unavailable';

  const scoreDelta = deltaPercentagePoints != null && Number.isFinite(Number(deltaPercentagePoints))
    ? Number(deltaPercentagePoints)
    : currentScore - prevScore;
  const isIncrease = scoreDelta > 0;
  const isZero = scoreDelta === 0;

  return (
    <div className="longitudinal-comparison-card" aria-labelledby="longitudinal-heading">
      <div className="comparison-header">
        <div className="section-badge badge-blue">
          <HistoryIcon size={14} />
          <span>Longitudinal Trajectory Comparison</span>
        </div>
        <h4 id="longitudinal-heading" className="comparison-title">
          Comparison with Previous Clinical Assessment
        </h4>
        <p className="comparison-desc">
          Tracking changes across time demonstrates risk progression and the impact of evolving biometric measurements.
        </p>
      </div>

      <div className="comparison-metrics-row">
        {/* Previous Assessment Box */}
        <div className="comparison-stat-box box-previous">
          <span className="box-label">Previous Assessment</span>
          <div className="box-score-row">
            <span className="box-score-val">{prevScore}%</span>
            <span className="box-tier-tag">{prevCategory || 'Category unavailable'}</span>
          </div>
          <div className="box-date-row">
            <CalendarIcon size={12} />
            <span>{formattedPrevDate}</span>
          </div>
        </div>

        {/* Delta Transition Arrow Box */}
        <div className="comparison-delta-box">
          <div className={`delta-badge ${isIncrease ? 'delta-up' : isZero ? 'delta-flat' : 'delta-down'}`}>
            {isIncrease ? (
              <TrendingUpIcon size={16} />
            ) : isZero ? (
              <span className="flat-dash">—</span>
            ) : (
              <TrendingDownIcon size={16} />
            )}
            <span className="delta-val">
              {isIncrease ? `+${scoreDelta}` : `${scoreDelta}`} percentage points
            </span>
          </div>
          <span className="delta-subtext">Estimated trajectory shift</span>
        </div>

        {/* Current Assessment Box */}
        <div className="comparison-stat-box box-current">
          <span className="box-label">Current Assessment</span>
          <div className="box-score-row">
            <span className="box-score-val highlight-score">{currentScore}%</span>
            <span className="box-tier-tag tag-current">Latest Evaluation</span>
          </div>
          <div className="box-date-row">
            <CalendarIcon size={12} />
            <span>Today (Active Session)</span>
          </div>
        </div>
      </div>

      {/* Changing Biometric Input Deltas */}
      {changedFeatures.length > 0 && (
        <div className="changing-features-panel">
          <span className="changing-heading">Evolving Biometric Trajectory:</span>
          <div className="changing-features-grid">
            {changedFeatures.map((feat, idx) => (
              <div key={idx} className="changing-feature-item">
                <div className="feature-top-meta">
                  <span className="feat-name">{feat.name}</span>
                  <span className={`feat-dir-tag dir-${feat.direction}`}>
                    {feat.direction === 'up' ? '↑ Increased' : '↓ Decreased'}
                  </span>
                </div>
                <div className="feat-transition-row">
                  <span className="prev-val">{feat.previous}</span>
                  <span className="transition-arrow">→</span>
                  <span className="curr-val">{feat.current}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
