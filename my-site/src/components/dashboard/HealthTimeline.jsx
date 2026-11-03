import { motion, useReducedMotion } from 'motion/react';
import {
  HistoryIcon,
  CalendarIcon,
  FlaskConicalIcon,
  StethoscopeIcon,
  BrainIcon,
  FlameIcon,
  FileTextIcon,
} from '../Icons';

export function HealthTimeline({ activities = [] }) {
  const shouldReduceMotion = useReducedMotion();

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'ml assessment':
        return <BrainIcon size={16} className="timeline-node-icon icon-cyan" />;
      case 'lab record':
        return <FlaskConicalIcon size={16} className="timeline-node-icon icon-teal" />;
      case 'consultation':
        return <StethoscopeIcon size={16} className="timeline-node-icon icon-blue" />;
      case 'lifestyle':
        return <FlameIcon size={16} className="timeline-node-icon icon-emerald" />;
      default:
        return <FileTextIcon size={16} className="timeline-node-icon icon-slate" />;
    }
  };

  return (
    <section className="health-timeline-section" aria-labelledby="health-timeline-title">
      <div className="section-header-compact">
        <div className="section-title-group">
          <div className="section-badge badge-blue">
            <HistoryIcon size={14} />
            <span>Care Journey Chronology</span>
          </div>
          <h2 id="health-timeline-title" className="section-heading-sm">
            Recent Health Activity &amp; Clinical Milestone Log
          </h2>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-spine" />
        <div className="timeline-items-list">
          {activities.length === 0 && <p className="empty-state-message">No health activity has been recorded yet.</p>}
          {activities.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              className="timeline-item-row"
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.4 }}
            >
              {/* Chronological Node Circle */}
              <div className="timeline-node-wrap">
                <div className={`timeline-node-circle circle-${item.badgeColor || 'cyan'}`}>
                  {getCategoryIcon(item.category)}
                </div>
              </div>

              {/* Activity Content Card */}
              <div className="timeline-content-card">
                <div className="timeline-card-header">
                  <div className="timeline-title-group">
                    <span className="timeline-category-tag">{item.category}</span>
                    <h3 className="timeline-event-title">{item.title}</h3>
                  </div>
                  <div className="timeline-date-wrap">
                    <CalendarIcon size={13} />
                    <span>{item.timestampText}</span>
                  </div>
                </div>

                <p className="timeline-event-summary">{item.summary}</p>

                {item.clinicalNote && (
                  <div className="timeline-clinical-note-box">
                    <span className="clinical-note-label">Clinical Observation:</span>
                    <span className="clinical-note-text">{item.clinicalNote}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
