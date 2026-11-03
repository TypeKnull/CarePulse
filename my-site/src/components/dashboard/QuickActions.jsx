import { motion, useReducedMotion } from 'motion/react';
import {
  PlusIcon,
  BrainIcon,
  HistoryIcon,
  FileTextIcon,
  FlameIcon,
  SparklesIcon,
  HeartPulseIcon,
} from '../Icons';

export function QuickActions({
  onAddLab,
  onRunMLAssessment,
  onUpdateLifestyle,
  onRecordVitals,
  onViewRecords,
  onPrepareDoctorBrief,
}) {
  const shouldReduceMotion = useReducedMotion();

  const actions = [
    {
      id: 'ml-assessment',
      label: 'Run ML Risk Assessment',
      sublabel: 'Predict Diabetes, Cardiac & HTN',
      icon: <BrainIcon size={18} />,
      colorClass: 'action-cyan',
      onClick: onRunMLAssessment,
    },
    {
      id: 'add-lab',
      label: 'Record Lab Result',
      sublabel: 'Save a result and collection date',
      icon: <PlusIcon size={18} />,
      colorClass: 'action-teal',
      onClick: onAddLab,
    },
    {
      id: 'update-lifestyle',
      label: 'Update Lifestyle Log',
      sublabel: 'Save activity and smoking status history',
      icon: <FlameIcon size={18} />,
      colorClass: 'action-emerald',
      onClick: onUpdateLifestyle,
    },
    {
      id: 'record-vitals',
      label: 'Record Vitals',
      sublabel: 'Save a timestamped clinical measurement',
      icon: <HeartPulseIcon size={18} />,
      colorClass: 'action-blue',
      onClick: onRecordVitals,
    },
    {
      id: 'view-records',
      label: 'View Recent Activity',
      sublabel: 'Saved assessments and vitals',
      icon: <HistoryIcon size={18} />,
      colorClass: 'action-blue',
      onClick: onViewRecords,
    },
    {
      id: 'doctor-brief',
      label: 'View Upcoming Care',
      sublabel: 'Review recorded appointment details',
      icon: <FileTextIcon size={18} />,
      colorClass: 'action-indigo',
      onClick: onPrepareDoctorBrief,
    },
  ];

  return (
    <section className="quick-actions-section" aria-label="Quick Clinical Actions">
      <div className="quick-actions-bar">
        <div className="quick-actions-heading-wrap">
          <SparklesIcon size={16} className="quick-actions-sparkle" />
          <span className="quick-actions-label">Quick Care Actions</span>
        </div>
        <div className="quick-actions-grid">
          {actions.map((action, idx) => (
            <motion.button
              key={action.id}
              type="button"
              className={`quick-action-btn ${action.colorClass}`}
              onClick={action.onClick}
              disabled={action.disabled}
              title={action.disabled ? action.sublabel : undefined}
              aria-label={action.disabled ? `${action.label}. ${action.sublabel}` : action.label}
              whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
            >
              <span className="quick-action-icon-wrap">{action.icon}</span>
              <div className="quick-action-text-wrap">
                <span className="quick-action-title">{action.label}</span>
                <span className="quick-action-sub">{action.sublabel}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
