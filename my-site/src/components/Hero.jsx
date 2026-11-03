import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DnaHelixAnimation } from './DnaHelixAnimation';
import {
  ArrowRightIcon,
  SparklesIcon,
  CheckCircle2Icon,
  StethoscopeIcon,
  ShieldCheckIcon,
  HeartPulseIcon,
  BrainIcon,
  BoneIcon,
  LungsIcon,
  FileTextIcon,
  GaugeIcon,
  ActivityIcon,
} from './Icons';
import { useNavigation } from '../context/NavigationContext';

export function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const { navigate } = useNavigation();
  const [selectedSymptomId, setSelectedSymptomId] = useState('chest');
  const [activeSignalPulse, setActiveSignalPulse] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const symptomsData = [
    {
      id: 'chest',
      name: 'Chest Discomfort',
      category: 'Cardiovascular',
      severity: 'Priority Review',
      duration: 'Recent Onset',
      icon: <HeartPulseIcon size={16} />,
      specialty: 'Cardiology & Internal Medicine',
      acuity: 'Clinical Review Needed',
      acuityColor: 'crimson',
      guidance: 'Rest immediately and avoid exertion. Seek emergency care (112) if pain radiates to jaw or left arm.',
      doctorQuestion: 'Would a resting 12-lead ECG, blood pressure series, and baseline cardiac enzyme panel be advised?',
    },
    {
      id: 'headache',
      name: 'Tension Headache',
      category: 'Neurological',
      severity: 'Moderate',
      duration: '2 Days',
      icon: <BrainIcon size={16} />,
      specialty: 'Neurology & Primary Care',
      acuity: 'Scheduled Consultation',
      acuityColor: 'amber',
      guidance: 'Minimize digital screen exposure, maintain hydration and regular sleep cycles, monitor trigger patterns.',
      doctorQuestion: 'Could this relate to cervicogenic postural strain, sleep deficit, or refractive eye strain?',
    },
    {
      id: 'fatigue',
      name: 'Chronic Daytime Fatigue',
      category: 'Metabolic',
      severity: 'Mild-Moderate',
      duration: '3 Weeks',
      icon: <ActivityIcon size={16} />,
      specialty: 'General Physician & Preventative Care',
      acuity: 'Routine Evaluation',
      acuityColor: 'emerald',
      guidance: 'Maintain consistent 8-hour sleep timing, balanced whole-food nutrition, and 2.5L daily hydration.',
      doctorQuestion: 'Should we evaluate a comprehensive metabolic panel, fasting glucose, thyroid, and vitamin D/B12 levels?',
    },
    {
      id: 'knee',
      name: 'Joint Stiffness',
      category: 'Musculoskeletal',
      severity: 'Moderate',
      duration: '1 Week',
      icon: <BoneIcon size={16} />,
      specialty: 'Orthopedics & Physical Therapy',
      acuity: 'Routine Evaluation',
      acuityColor: 'emerald',
      guidance: 'Perform gentle low-impact range-of-motion stretching; avoid repetitive high-impact weight loading.',
      doctorQuestion: 'Would structured physical therapy or specific strengthening exercises be beneficial for joint alignment?',
    },
    {
      id: 'breathing',
      name: 'Mild Breathlessness',
      category: 'Respiratory',
      severity: 'Priority Review',
      duration: '1 Day',
      icon: <LungsIcon size={16} />,
      specialty: 'Pulmonology & Internal Medicine',
      acuity: 'Clinical Evaluation Advised',
      acuityColor: 'crimson',
      guidance: 'Rest in an upright seated posture, avoid allergens and cold air; call 112 if breathing becomes labored.',
      doctorQuestion: 'Would a peak-flow evaluation or baseline spirometry screening be recommended?',
    },
  ];

  const currentItem = symptomsData.find((item) => item.id === selectedSymptomId) || symptomsData[0];

  const handleSelectSymptom = (id) => {
    setSelectedSymptomId(id);
    setActiveSignalPulse(true);
    setTimeout(() => setActiveSignalPulse(false), 900);
  };

  const handleMouseMove = (e) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  const scrollToSection = (selector) => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="hero-section">
      <div className="container hero-container-layout">
        {/* Left Column: Value Proposition & Healthcare Entrypoints */}
        <motion.div
          className="hero-content-col"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {/* Status Badge */}
          <div className="hero-status-pill">
            <span className="live-status-dot" />
            <span>Intelligent Healthcare Management • Clinical Direction</span>
          </div>

          {/* Headline */}
          <h1 className="hero-headline">
            Intelligent Health Management &amp;{' '}
            <span className="hero-gradient-text">Predictive Disease Risk Assessment.</span>
          </h1>

          {/* Supporting Description */}
          <p className="hero-description">
            CarePulse is an intelligent healthcare platform. Evaluate multi-factor disease risks using trained ML models, organize longitudinal health records, understand clinical symptoms, and receive tailored preventive care guidance.
          </p>

          {/* Action CTAs */}
          <div className="hero-cta-row">
            <button
              type="button"
              className="hero-primary-btn"
              onClick={() => navigate('/register')}
            >
              <span>Get Started — Create Account</span>
              <ArrowRightIcon size={18} />
            </button>

            <button
              type="button"
              className="hero-secondary-btn"
              onClick={() => scrollToSection('#platform')}
            >
              <SparklesIcon size={16} />
              <span>Explore Platform Technology</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="hero-trust-matrix">
            <div className="trust-indicator-item">
              <ShieldCheckIcon size={18} className="trust-icon-teal" />
              <span>Evidence-Informed</span>
            </div>
            <div className="trust-indicator-item">
              <SparklesIcon size={18} className="trust-icon-cyan" />
              <span>ML Predictive Models</span>
            </div>
            <div className="trust-indicator-item">
              <CheckCircle2Icon size={18} className="trust-icon-teal" />
              <span>Private &amp; Secure</span>
            </div>
            <div className="trust-indicator-item">
              <StethoscopeIcon size={18} className="trust-icon-cyan" />
              <span>Doctor Consultation Ready</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Living Biological Visual Centerpiece */}
        <div
          className="hero-visual-stage"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Ambient Biological Parallax Backdrop */}
          <div
            className="hero-parallax-canvas"
            style={{
              transform: `translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`,
              transition: shouldReduceMotion ? 'none' : 'transform 0.25s ease-out',
            }}
          >
            {/* 1. Continuous Clinical ECG Telemetry Waveform Ribbon */}
            <div className="hero-ecg-ribbon-card">
              <div className="ecg-telemetry-status">
                <span className="ecg-live-pulse-dot" />
                <span className="ecg-telemetry-label">Interactive Preview • Illustrative Telemetry Signal Stream</span>
              </div>
              <div className="ecg-waveform-track" aria-hidden="true">
                <svg className="ecg-telemetry-svg" viewBox="0 0 400 36" preserveAspectRatio="none">
                  <path
                    className="ecg-grid-line"
                    d="M 0 18 L 400 18"
                  />
                  <path
                    className="ecg-rhythm-path"
                    d="M 0 18 L 50 18 L 58 18 L 64 9 L 70 27 L 76 4 L 82 32 L 88 18 L 96 18 L 190 18 L 198 18 L 204 9 L 210 27 L 216 4 L 222 32 L 228 18 L 236 18 L 330 18 L 338 18 L 344 9 L 350 27 L 356 4 L 362 32 L 368 18 L 376 18 L 400 18"
                  />
                </svg>
              </div>
            </div>

            {/* 2. Central Living DNA Double Helix Core */}
            <div className="hero-dna-core-container">
              <DnaHelixAnimation
                width={150}
                height={320}
                pairCount={13}
                speed={0.85}
                colorA="#06B6D4"
                colorB="#10B981"
              />
              <div className="dna-aurora-halo" />
            </div>

            {/* 3. Synaptic Signal Network Conduits */}
            <div className="synaptic-conduit-overlay" aria-hidden="true">
              <svg className="synaptic-svg-lines" viewBox="0 0 540 380">
                <defs>
                  <linearGradient id="synapsePulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0891B2" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <path className={`synapse-path ${activeSignalPulse ? 'synapse-path-firing' : ''}`} d="M 90 80 Q 200 120 270 160" />
                <path className={`synapse-path ${activeSignalPulse ? 'synapse-path-firing' : ''}`} d="M 90 190 Q 180 180 270 180" />
                <path className={`synapse-path ${activeSignalPulse ? 'synapse-path-firing' : ''}`} d="M 90 300 Q 190 240 270 200" />
                <path className={`synapse-path ${activeSignalPulse ? 'synapse-path-firing' : ''}`} d="M 270 170 Q 360 140 430 110" />
                <path className={`synapse-path ${activeSignalPulse ? 'synapse-path-firing' : ''}`} d="M 270 190 Q 360 220 430 250" />
              </svg>
            </div>

            {/* 4. Interactive Floating Symptom Capsules */}
            <div className="hero-symptom-orbit-col">
              <span className="orbit-section-kicker">Interactive Signal Preview</span>
              {symptomsData.map((item) => {
                const isSelected = selectedSymptomId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`symptom-node-capsule ${isSelected ? 'node-capsule-active' : ''}`}
                    onClick={() => handleSelectSymptom(item.id)}
                    aria-pressed={isSelected}
                  >
                    <div className="capsule-icon-box">{item.icon}</div>
                    <div className="capsule-text-box">
                      <span className="capsule-name">{item.name}</span>
                      <span className="capsule-meta">{item.category} • {item.severity}</span>
                    </div>
                    {isSelected && <span className="capsule-active-indicator" />}
                  </button>
                );
              })}
            </div>

            {/* 5. Floating Health Guidance Demonstration Panel */}
            <div className="hero-guidance-floating-card">
              <div className="guidance-card-top">
                <div className="specialty-indicator-group">
                  <div className="specialist-avatar-icon">
                    <StethoscopeIcon size={20} />
                  </div>
                  <div>
                    <span className="guidance-kicker">Sample Specialist Discipline</span>
                    <h4 className="guidance-specialty-title">{currentItem.specialty}</h4>
                  </div>
                </div>

                <div className={`guidance-acuity-tag acuity-tag-${currentItem.acuityColor}`}>
                  <span className="acuity-pulsing-dot" />
                  <span>{currentItem.acuity}</span>
                </div>
              </div>

              <div className="guidance-rationale-box">
                <span className="rationale-heading">Illustrative Triage Direction:</span>
                <p className="rationale-text">{currentItem.guidance}</p>
              </div>

              <div className="guidance-doctor-prompt">
                <FileTextIcon size={14} className="doctor-prompt-icon" />
                <span className="doctor-prompt-text">
                  <strong>Physician Question Template:</strong> &ldquo;{currentItem.doctorQuestion}&rdquo;
                </span>
              </div>

              {/* 6. Mini Health Risk / Disease Prediction Preview */}
              <div className="hero-risk-preview-strip">
                <div className="risk-strip-header">
                  <div className="risk-strip-title-group">
                    <GaugeIcon size={14} className="risk-strip-icon" />
                    <span>Predictive Risk Assessment Engine</span>
                  </div>
                  <span className="sample-preview-badge">Sample Model Preview • Not Linked to Personal Record</span>
                </div>

                <div className="risk-gauges-mini-grid">
                  <div className="mini-gauge-item">
                    <div className="mini-gauge-label-row">
                      <span>Type-2 Diabetes Model</span>
                      <strong>Sample: 28%</strong>
                    </div>
                    <div className="mini-gauge-track">
                      <div className="mini-gauge-fill fill-emerald" style={{ width: '28%' }} />
                    </div>
                  </div>

                  <div className="mini-gauge-item">
                    <div className="mini-gauge-label-row">
                      <span>Cardiovascular Model</span>
                      <strong>Sample: 42%</strong>
                    </div>
                    <div className="mini-gauge-track">
                      <div className="mini-gauge-fill fill-amber" style={{ width: '42%' }} />
                    </div>
                  </div>

                  <div className="mini-gauge-item">
                    <div className="mini-gauge-label-row">
                      <span>Hypertension Model</span>
                      <strong>Sample: 31%</strong>
                    </div>
                    <div className="mini-gauge-track">
                      <div className="mini-gauge-fill fill-cyan" style={{ width: '31%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="guidance-card-footer-meta">
                <span>CarePulse Technology Demonstration • Educational Guidance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
