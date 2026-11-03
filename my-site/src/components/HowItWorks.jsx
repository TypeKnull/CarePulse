import { motion, useReducedMotion } from 'motion/react';
import {
  ClipboardCheckIcon,
  ActivityIcon,
  StethoscopeIcon,
  ArrowRightIcon,
  SparklesIcon,
} from './Icons';

export function HowItWorks({ onStartCheck }) {
  const shouldReduceMotion = useReducedMotion();

  const stages = [
    {
      stageNumber: '01',
      title: 'Describe Symptoms',
      subtitle: 'Structured Biometric Input',
      icon: <ClipboardCheckIcon size={28} />,
      description:
        'Input your primary symptoms, onset timing, pain intensity, and aggravating patterns through our intuitive, guided assessment workflow.',
      highlights: [
        'Anatomical category selection',
        'Duration & severity grading',
        'Personal context & triggers',
      ],
    },
    {
      stageNumber: '02',
      title: 'Understand Your Situation',
      subtitle: 'Clinical Correlation Matrix',
      icon: <ActivityIcon size={28} />,
      description:
        'Our clinical correlation engine evaluates your symptom profile against established triage matrices to determine urgency and appropriate care domains.',
      highlights: [
        'Evidence-informed triage grading',
        'Multi-symptom pattern check',
        'Jargon-free explanation',
      ],
    },
    {
      stageNumber: '03',
      title: 'Navigate Your Care',
      subtitle: 'Actionable Healthcare Direction',
      icon: <StethoscopeIcon size={28} />,
      description:
        'Receive tailored next steps: matched medical specialties, evidence-based home measures, and an exportable checklist of questions for your doctor.',
      highlights: [
        'Specialist domain matching',
        'Practical self-care guidance',
        'Physician consultation preparation',
      ],
    },
  ];

  return (
    <section id="how-it-works" className="how-it-works-section section-padding">
      <div className="container">
        {/* Section Header */}
        <div className="section-header-center">
          <div className="section-badge badge-journey">
            <SparklesIcon size={16} />
            <span>Structured Healthcare Journey</span>
          </div>
          <h2 className="section-title">How CarePulse Guides You</h2>
          <p className="section-subtitle">
            A transparent, three-stage clinical workflow designed to replace confusion with clarity and prepare you for confident healthcare decisions.
          </p>
        </div>

        {/* 3 Stage Journey Cards Grid with Connected Progress Rail */}
        <div className="journey-stages-grid">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.stageNumber}
              className="journey-card"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.15 }}
            >
              <div className="journey-card-top">
                <div className="journey-icon-wrap">{stage.icon}</div>
                <div className="journey-stage-badge">Stage {stage.stageNumber}</div>
              </div>

              <span className="journey-subtitle">{stage.subtitle}</span>
              <h3 className="journey-title">{stage.title}</h3>
              <p className="journey-desc">{stage.description}</p>

              <div className="journey-divider" />

              <ul className="journey-points-list">
                {stage.highlights.map((item, idx) => (
                  <li key={idx} className="journey-point-item">
                    <span className="journey-check-bullet">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="journey-cta-banner">
          <div className="journey-banner-text">
            <h3 className="banner-heading">Ready to assess your symptoms?</h3>
            <p className="banner-subtext">
              Begin your guided evaluation now and receive tailored clinical direction in under two minutes.
            </p>
          </div>
          <button
            type="button"
            className="journey-banner-btn"
            onClick={onStartCheck}
          >
            <span>Start Symptom Check</span>
            <ArrowRightIcon size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
