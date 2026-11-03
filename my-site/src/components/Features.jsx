import { motion, useReducedMotion } from 'motion/react';
import {
  ActivityIcon,
  UsersIcon,
  HistoryIcon,
  SparklesIcon,
  FileTextIcon,
  ShieldCheckIcon,
} from './Icons';

export function Features() {
  const shouldReduceMotion = useReducedMotion();

  const capabilities = [
    {
      icon: <ActivityIcon size={24} />,
      kicker: 'Multi-Factor Evaluation',
      title: 'Precision Symptom Assessment',
      description:
        'Capture intricate symptom profiles including onset timing, pain grading, and aggravating factors for reliable triage grading.',
      points: ['Intuitive symptom search', 'Acuity & duration grading', 'Red-flag symptom screening'],
    },
    {
      icon: <UsersIcon size={24} />,
      kicker: 'Domain Mapping',
      title: 'Specialist Care Navigation',
      description:
        'Connect your reported clinical profile to the most appropriate healthcare disciplines (Cardiology, ENT, Neurology, Orthopedics).',
      points: ['Clinical specialty matching', 'Clear referral rationale', 'Targeted care direction'],
    },
    {
      icon: <SparklesIcon size={24} />,
      kicker: 'Evidence-Based Self-Care',
      title: 'Personalized Guidance',
      description:
        'Receive actionable lifestyle, hydration, and non-pharmacological comfort measures tailored to your specific symptom cluster.',
      points: ['Practical home protocols', 'Hydration & rest guidelines', 'Safety boundary advisories'],
    },
    {
      icon: <FileTextIcon size={24} />,
      kicker: 'Doctor Visit Readiness',
      title: 'Consultation Preparation',
      description:
        'Generate structured, printable consultation summaries with key questions to ask your physician during in-person visits.',
      points: ['Printable symptom summary', 'Curated doctor questions', 'Clear chronological timeline'],
    },
    {
      icon: <HistoryIcon size={24} />,
      kicker: 'Longitudinal Wellness',
      title: 'Health Pattern Tracking',
      description:
        'Maintain an organized history of past assessments to monitor recurring symptom patterns and share trends with your doctor.',
      points: ['Historical check logs', 'Recurring pattern notes', 'Secure patient portal integration'],
    },
    {
      icon: <ShieldCheckIcon size={24} />,
      kicker: 'Clinical Integrity',
      title: 'Safety & Triage Standards',
      description:
        'Built with strict non-diagnostic boundaries to prioritize patient wellbeing and guide acute cases to immediate emergency care.',
      points: ['Validated triage standards', 'Emergency rapid dispatch', 'Transparent clinical limits'],
    },
  ];

  return (
    <section id="features" className="features-section section-padding">
      <div className="container">
        {/* Section Header */}
        <div className="section-header-center">
          <div className="section-badge badge-capabilities">
            <SparklesIcon size={16} />
            <span>Healthcare Capabilities</span>
          </div>
          <h2 className="section-title">Engineered for Clinical Clarity &amp; Care</h2>
          <p className="section-subtitle">
            Combining modern triage principles with human-centered interaction to empower patients across their health journey.
          </p>
        </div>

        {/* 6 Capabilities Grid */}
        <div className="capabilities-cards-grid">
          {capabilities.map((item, index) => (
            <motion.div
              key={item.title}
              className="capability-card"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <div className="capability-icon-wrap">{item.icon}</div>
              <span className="capability-kicker">{item.kicker}</span>
              <h3 className="capability-title">{item.title}</h3>
              <p className="capability-desc">{item.description}</p>

              <div className="capability-divider" />

              <ul className="capability-bullets-list">
                {item.points.map((pt, idx) => (
                  <li key={idx} className="capability-bullet-item">
                    <span className="bullet-glow-dot" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
