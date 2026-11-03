import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { submitSymptomAssessment } from '../services/api';
import {
  BrainIcon,
  LungsIcon,
  HeartPulseIcon,
  BoneIcon,
  ActivityIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  ArrowLeftIcon,
  RotateCcwIcon,
  AlertTriangleIcon,
  StethoscopeIcon,
  ShieldCheckIcon,
  FileTextIcon,
} from './Icons';

export function SymptomChecker() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('respiratory');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [severity, setSeverity] = useState('');
  const [duration, setDuration] = useState('');
  const [aggravatingFactors, setAggravatingFactors] = useState([]);
  const [ageGroup, setAgeGroup] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [assessment, setAssessment] = useState(null);

  // Body Categories & Common Symptoms
  const categories = [
    {
      id: 'respiratory',
      label: 'Respiratory & Throat',
      icon: <LungsIcon size={20} />,
      symptoms: [
        'Throat Irritation',
        'Mild Dry Cough',
        'Productive Cough with Phlegm',
        'Nasal Congestion & Runny Nose',
        'Mild Wheezing',
        'Loss of Smell or Taste',
      ],
    },
    {
      id: 'neurological',
      label: 'Head & Neurological',
      icon: <BrainIcon size={20} />,
      symptoms: [
        'Tension Headache',
        'Throbbing Temple Pain',
        'Light & Sound Sensitivity',
        'Mild Dizziness or Vertigo',
        'Mental Fog & Concentration Strain',
        'Eye Strain or Orbital Ache',
      ],
    },
    {
      id: 'cardiovascular',
      label: 'Chest & Circulation',
      icon: <HeartPulseIcon size={20} />,
      symptoms: [
        'Occasional Heart Palpitations',
        'Mild Post-Exertion Chest Tightness',
        'Leg Swelling after Sitting',
        'Cold Extremities & Numbness',
        'Rapid Heartbeat during Rest',
      ],
    },
    {
      id: 'musculoskeletal',
      label: 'Joints & Muscles',
      icon: <BoneIcon size={20} />,
      symptoms: [
        'Knee Joint Stiffness',
        'Lower Back Ache',
        'Shoulder Range Limitation',
        'Morning Neck Stiffness',
        'Ankle Tenderness on Walking',
        'Post-Exercise Muscle Spasm',
      ],
    },
    {
      id: 'digestive',
      label: 'Digestive & Abdominal',
      icon: <ActivityIcon size={20} />,
      symptoms: [
        'Upper Abdominal Burning (Reflux)',
        'Post-Meal Bloating & Cramping',
        'Mild Intermittent Nausea',
        'Changes in Bowel Frequency',
        'Loss of Appetite',
      ],
    },
    {
      id: 'general',
      label: 'General & Vitality',
      icon: <SparklesIcon size={20} />,
      symptoms: [
        'Persistent Daytime Fatigue',
        'Low-Grade Evening Fever (<38°C)',
        'Restless Sleep & Night Wakings',
        'General Muscle Heaviness',
        'Mild Dehydration Symptoms',
      ],
    },
  ];

  const durations = ['Under 24 Hours', '2 - 3 Days', '1 - 2 Weeks', 'Over 1 Month'];
  const severities = ['Mild', 'Moderate', 'Significant'];
  const factorOptions = [
    'Worse with physical exertion',
    'Worse at night or lying down',
    'Triggered after certain meals',
    'Relieved by rest and hydration',
    'Accompanied by mild fatigue',
  ];

  const handleToggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      if (selectedSymptoms.length > 1) {
        setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
      }
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleToggleFactor = (factor) => {
    if (aggravatingFactors.includes(factor)) {
      setAggravatingFactors(aggravatingFactors.filter((f) => f !== factor));
    } else {
      setAggravatingFactors([...aggravatingFactors, factor]);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedCategory('respiratory');
    setSelectedSymptoms([]);
    setSeverity('');
    setDuration('');
    setAggravatingFactors([]);
    setAgeGroup('');
    setAssessment(null);
    setAssessmentError('');
  };

  const rec = assessment ? {
    specialty: 'Qualified healthcare professional',
    triageLevel: assessment.isEmergency ? 'Emergency guidance' : `${assessment.severity} symptom guidance`,
    triageColor: assessment.isEmergency ? 'crimson' : assessment.severity === 'Mild' ? 'emerald' : 'amber',
    rationale: assessment.guidance,
    selfCare: [],
    doctorQuestions: [],
  } : null;

  const handleGenerateAssessment = async () => {
    if (!selectedSymptoms.length || !severity || !duration) {
      setAssessmentError('Select at least one symptom, severity, and duration to continue.');
      return;
    }
    setIsSubmitting(true);
    setAssessmentError('');
    try {
      const result = await submitSymptomAssessment({
        selectedSymptoms,
        category: selectedCategory,
        severity: severity === 'Significant' ? 'Severe' : severity,
        duration,
        ageGroup,
        aggravatingFactors,
      });
      setAssessment(result);
      setCurrentStep(3);
    } catch (error) {
      setAssessmentError(error.message || 'The symptom assessment service is unavailable. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySummary = () => {
    const text = `CarePulse Health Consultation Summary
Date: ${new Date().toLocaleDateString()}
Selected Symptoms: ${selectedSymptoms.join(', ')}
Severity: ${severity} | Duration: ${duration}
Assessment guidance: ${rec?.rationale || 'No completed assessment.'}
(Informational triage only; this is not a medical diagnosis.)`;

    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <section id="symptoms" className="symptom-checker-section section-padding">
      <div className="container">
        {/* Section Header */}
        <div className="section-header-center">
          <div className="section-badge badge-checker">
            <SparklesIcon size={16} />
            <span>Interactive Care Assessment</span>
          </div>
          <h2 className="section-title">Personalized Symptom Evaluation</h2>
          <p className="section-subtitle">
            Structure your symptoms in three intuitive steps. Receive clear clinical triage guidance, evidence-informed self-care measures, and key questions for your physician.
          </p>
        </div>

        {/* Assessment Card Suite */}
        <div className="checker-suite-card">
          {/* Progress Tracker */}
          <div className="checker-stepper-bar">
            <div className={`step-node ${currentStep >= 1 ? 'step-node-active' : ''} ${currentStep > 1 ? 'step-node-completed' : ''}`}>
              <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
              <div className="step-label-group">
                <span className="step-sub">Step 1</span>
                <span className="step-name">Identify Symptoms</span>
              </div>
            </div>

            <div className={`stepper-connector ${currentStep >= 2 ? 'connector-active' : ''}`} />

            <div className={`step-node ${currentStep >= 2 ? 'step-node-active' : ''} ${currentStep > 2 ? 'step-node-completed' : ''}`}>
              <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
              <div className="step-label-group">
                <span className="step-sub">Step 2</span>
                <span className="step-name">Severity &amp; Timing</span>
              </div>
            </div>

            <div className={`stepper-connector ${currentStep >= 3 ? 'connector-active' : ''}`} />

            <div className={`step-node ${currentStep >= 3 ? 'step-node-active' : ''}`}>
              <div className="step-circle">3</div>
              <div className="step-label-group">
                <span className="step-sub">Step 3</span>
                <span className="step-name">Care Pathway</span>
              </div>
            </div>
          </div>

          {/* Stepper Content Area */}
          <div className="checker-stepper-body">
            <AnimatePresence mode="wait">
              {/* STEP 1: Symptom Selection */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="step-content-pane"
                >
                  <div className="pane-header">
                    <h3 className="pane-title">What anatomical area or symptom is concerning you?</h3>
                    <p className="pane-subtitle">
                      Choose a primary category, then select all symptoms currently affecting you.
                    </p>
                  </div>

                  {/* Category Selection Tabs */}
                  <div className="category-tabs-grid">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-tab-btn ${selectedCategory === cat.id ? 'tab-btn-active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <div className="tab-icon">{cat.icon}</div>
                        <span className="tab-label">{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Symptom Tag Cloud for Selected Category */}
                  <div className="symptom-selection-box">
                    <label className="symptom-box-label">
                      Select all symptoms that apply ({categories.find((c) => c.id === selectedCategory)?.label}):
                    </label>
                    <div className="symptom-chips-wrap">
                      {categories
                        .find((c) => c.id === selectedCategory)
                        ?.symptoms.map((symptom) => {
                          const isSelected = selectedSymptoms.includes(symptom);
                          return (
                            <button
                              key={symptom}
                              type="button"
                              className={`symptom-capsule-btn ${isSelected ? 'capsule-selected' : ''}`}
                              onClick={() => handleToggleSymptom(symptom)}
                            >
                              <span className="capsule-check">{isSelected ? '✓' : '+'}</span>
                              <span className="capsule-text">{symptom}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Step 1 Actions */}
                  <div className="step-footer-actions">
                    <div className="selected-summary-pill">
                      <span>{selectedSymptoms.length} symptom{selectedSymptoms.length > 1 ? 's' : ''} selected</span>
                    </div>
                    <button
                      type="button"
                      className="step-primary-btn"
                      onClick={() => setCurrentStep(2)}
                    >
                      <span>Continue to Severity &amp; Timing</span>
                      <ArrowRightIcon size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Severity, Timing & Context */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="step-content-pane"
                >
                  <div className="pane-header">
                    <h3 className="pane-title">Provide Context on Severity &amp; Duration</h3>
                    <p className="pane-subtitle">
                      Enter the symptom details for an informational triage response.
                    </p>
                  </div>

                  <div className="context-controls-grid">
                    {/* Severity Selector */}
                    <div className="control-group">
                      <label className="control-label">Symptom Intensity</label>
                      <div className="tactile-options-row">
                        {severities.map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            className={`tactile-option-btn ${severity === sev ? 'tactile-active' : ''}`}
                            onClick={() => setSeverity(sev)}
                          >
                            <span className="tactile-indicator" />
                            <span>{sev}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration Selector */}
                    <div className="control-group">
                      <label className="control-label">How long have symptoms lasted?</label>
                      <div className="tactile-options-row">
                        {durations.map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            className={`tactile-option-btn ${duration === dur ? 'tactile-active' : ''}`}
                            onClick={() => setDuration(dur)}
                          >
                            <span>{dur}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Age Group Context */}
                    <div className="control-group">
                      <label className="control-label">Age Context</label>
                      <div className="tactile-options-row">
                        {['Child (<18)', 'Adult (18-64)', 'Senior (65+)'].map((age) => (
                          <button
                            key={age}
                            type="button"
                            className={`tactile-option-btn ${ageGroup === age ? 'tactile-active' : ''}`}
                            onClick={() => setAgeGroup(age)}
                          >
                            <span>{age}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aggravating / Relieving Factors */}
                    <div className="control-group full-width-group">
                      <label className="control-label">Associated Patterns &amp; Triggers</label>
                      <div className="factor-checkboxes-grid">
                        {factorOptions.map((factor) => {
                          const checked = aggravatingFactors.includes(factor);
                          return (
                            <button
                              key={factor}
                              type="button"
                              className={`factor-card-btn ${checked ? 'factor-checked' : ''}`}
                              onClick={() => handleToggleFactor(factor)}
                            >
                              <span className="factor-box">{checked ? '✓' : ''}</span>
                              <span className="factor-text">{factor}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Actions */}
                  <div className="step-footer-actions">
                    <button
                      type="button"
                      className="step-secondary-btn"
                      onClick={() => setCurrentStep(1)}
                    >
                      <ArrowLeftIcon size={18} />
                      <span>Back to Symptoms</span>
                    </button>
                    <button
                      type="button"
                      className="step-primary-btn"
                      onClick={handleGenerateAssessment}
                      disabled={isSubmitting}
                    >
                      <span>{isSubmitting ? 'Submitting Assessment…' : 'Generate Care Pathway'}</span>
                      {!isSubmitting && <ArrowRightIcon size={18} />}
                    </button>
                  </div>
                  {assessmentError && <p className="prediction-validation-error" role="alert">{assessmentError}</p>}
                </motion.div>
              )}

              {/* STEP 3: Complete Personalized Care Pathway */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="step-content-pane"
                >
                  <div className="pane-header">
                    <div className="assessment-complete-badge">
                      <ShieldCheckIcon size={18} />
                      <span>{assessment?.isEmergency ? 'Urgent Guidance' : 'Assessment Complete • Informational Triage'}</span>
                    </div>
                    <h3 className="pane-title">Symptom Assessment Guidance</h3>
                    <p className="pane-subtitle">
                      Based on your reported {selectedSymptoms.length} symptoms lasting {duration} with {severity.toLowerCase()} intensity. {assessment?.recordSaved ? 'Saved to your health record.' : 'Not saved to your health record.'}
                    </p>
                  </div>

                  {/* Care Pathway Output Matrix */}
                  <div className="care-pathway-matrix">
                    {/* Top Acuity & Specialist Bar */}
                    <div className="care-summary-banner">
                      <div className="care-specialist-info">
                        <div className="specialist-large-icon">
                          <StethoscopeIcon size={28} />
                        </div>
                        <div>
                          <span className="specialist-kicker">Recommended Specialist Discipline</span>
                          <h4 className="specialist-primary-title">{rec.specialty}</h4>
                        </div>
                      </div>

                      <div className={`triage-acuity-tag acuity-${rec.triageColor}`}>
                        <span className="acuity-dot" />
                        <span>{rec.triageLevel}</span>
                      </div>
                    </div>

                    {/* Clinical Rationale Box */}
                    <div className="care-detail-card">
                      <h4 className="care-card-heading">Clinical Evaluation &amp; Rationale</h4>
                      <p className="care-card-body">{rec.rationale}</p>
                    </div>

                    {/* Self-Care & Doctor Questions Grid */}
                    <div className="care-columns-grid">
                      {/* Left: Self-Care Measures */}
                      <div className="care-detail-card">
                        <h4 className="care-card-heading">
                          <SparklesIcon size={18} className="heading-icon" />
                          <span>Suggested Evidence-Based Self-Care</span>
                        </h4>
                        <ul className="care-guidance-list">
                          {rec.selfCare.length ? rec.selfCare.map((item, idx) => (
                            <li key={idx} className="care-guidance-item">
                              <span className="guidance-check">✓</span>
                              <span>{item}</span>
                            </li>
                          )) : <li className="care-guidance-item">No self-care plan was generated by the assessment service.</li>}
                        </ul>
                      </div>

                      {/* Right: Consultation Talking Points */}
                      <div className="care-detail-card">
                        <h4 className="care-card-heading">
                          <FileTextIcon size={18} className="heading-icon" />
                          <span>Questions to Ask Your Doctor</span>
                        </h4>
                        <ul className="care-guidance-list">
                          {rec.doctorQuestions.length ? rec.doctorQuestions.map((q, idx) => (
                            <li key={idx} className="care-guidance-item question-item">
                              <span className="question-bullet">Q{idx + 1}</span>
                              <span>{q}</span>
                            </li>
                          )) : <li className="care-guidance-item">Discuss your symptoms with a qualified healthcare professional.</li>}
                        </ul>
                      </div>
                    </div>

                    {/* Non-Diagnostic Clinical Safety Callout */}
                    <div className="assessment-disclaimer-callout">
                      <AlertTriangleIcon size={20} className="disclaimer-callout-icon" />
                      <div>
                        <strong>Informational triage only:</strong> {assessment?.disclaimer || 'This is not a clinical medical diagnosis. Consult a qualified healthcare professional.'}
                      </div>
                    </div>
                  </div>

                  {/* Step 3 Actions */}
                  <div className="step-footer-actions">
                    <button
                      type="button"
                      className="step-secondary-btn"
                      onClick={handleReset}
                    >
                      <RotateCcwIcon size={18} />
                      <span>Start New Assessment</span>
                    </button>

                    <button
                      type="button"
                      className="step-primary-btn"
                      onClick={handleCopySummary}
                    >
                      {isCopied ? <CheckCircle2Icon size={18} /> : <FileTextIcon size={18} />}
                      <span>{isCopied ? 'Summary Copied to Clipboard!' : 'Copy Consultation Summary'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
