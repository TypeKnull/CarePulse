import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  HeartPulseIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ActivityIcon,
  AlertTriangleIcon,
  UserIcon,
  ScaleIcon,
  DropletIcon,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export function OnboardingView() {
  const shouldReduceMotion = useReducedMotion();
  const { user, updateProfile, refreshProfile } = useAuth();
  const { navigate } = useNavigation();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0);
  const loadedUserId = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    dateOfBirth: user?.profile?.dateOfBirth || '',
    gender: user?.profile?.gender || '',
    bloodGroup: user?.profile?.bloodGroup || '',
    heightCm: user?.profile?.heightCm ?? '',
    weightKg: user?.profile?.weightKg ?? '',
    smokingStatus: user?.profile?.smokingStatus ?? null,
    physicalActivityDays: user?.profile?.physicalActivityDays ?? '',
    knownConditions: user?.profile?.knownConditions || [],
    allergies: user?.profile?.allergies || '',
    currentMedications: user?.profile?.currentMedications || '',
    familyHistory: user?.profile?.familyHistoryNotes || (user?.profile?.familyHistory == null ? '' : user.profile.familyHistory ? 'Yes' : 'No'),
    systolicBp: user?.vitals?.systolicBp ?? '',
    diastolicBp: user?.vitals?.diastolicBp ?? '',
    fastingGlucose: user?.vitals?.fastingGlucose ?? '',
    totalCholesterol: user?.vitals?.totalCholesterol ?? '',
    hdl: user?.vitals?.hdl ?? '',
    ldl: user?.vitals?.ldl ?? '',
    emergencyContactName: user?.profile?.emergencyContact?.name || '',
    emergencyContactPhone: user?.profile?.emergencyContact?.phone || '',
  });

  useEffect(() => {
    if (!user?.id || loadedUserId.current === user.id) return;
    loadedUserId.current = user.id;
    let isActive = true;
    setIsLoadingProfile(true);
    setProfileLoadError(false);
    refreshProfile()
      .then((savedUser) => {
        if (!isActive) return;
        if (!savedUser) throw new Error('Your saved profile could not be loaded. Please sign in again.');
        const profile = savedUser.profile || {};
        const vitals = savedUser.vitals || {};
        setFormData((current) => ({
          ...current,
          dateOfBirth: profile.dateOfBirth || '',
          gender: profile.gender || '',
          bloodGroup: profile.bloodGroup || '',
          heightCm: profile.heightCm ?? '',
          weightKg: profile.weightKg ?? '',
          smokingStatus: profile.smokingStatus ?? null,
          physicalActivityDays: profile.physicalActivityDays ?? '',
          knownConditions: profile.knownConditions || [],
          allergies: profile.allergies || '',
          currentMedications: profile.currentMedications || '',
          familyHistory: profile.familyHistoryNotes || (profile.familyHistory == null ? '' : profile.familyHistory ? 'Yes' : 'No'),
          emergencyContactName: profile.emergencyContact?.name || '',
          emergencyContactPhone: profile.emergencyContact?.phone || '',
          systolicBp: vitals.systolicBp ?? current.systolicBp,
          diastolicBp: vitals.diastolicBp ?? current.diastolicBp,
          fastingGlucose: vitals.fastingGlucose ?? current.fastingGlucose,
          totalCholesterol: vitals.totalCholesterol ?? current.totalCholesterol,
          hdl: vitals.hdl ?? current.hdl,
          ldl: vitals.ldl ?? current.ldl,
        }));
      })
      .catch((loadError) => {
        if (isActive) {
          setProfileLoadError(true);
          setError(loadError.message || 'Failed to load your saved profile.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingProfile(false);
      });
    return () => {
      isActive = false;
      if (loadedUserId.current === user.id) loadedUserId.current = null;
    };
  }, [user?.id, refreshProfile, profileLoadAttempt]);

  // Calculate BMI dynamically
  const calculatedBmi = useMemo(() => {
    const heightM = Number(formData.heightCm) / 100;
    const weight = Number(formData.weightKg);
    if (!heightM || !weight || heightM <= 0 || weight <= 0) return null;
    return parseFloat((weight / (heightM * heightM)).toFixed(1));
  }, [formData.heightCm, formData.weightKg]);

  const bmiCategory = useMemo(() => {
    if (calculatedBmi == null) return { label: 'Not available', color: 'cyan' };
    if (calculatedBmi < 18.5) return { label: 'Underweight', color: 'cyan' };
    if (calculatedBmi < 25) return { label: 'Normal Weight', color: 'emerald' };
    if (calculatedBmi < 30) return { label: 'Overweight', color: 'amber' };
    return { label: 'Obese', color: 'crimson' };
  }, [calculatedBmi]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConditionToggle = (condition) => {
    setFormData((prev) => {
      const exists = prev.knownConditions.includes(condition);
      return {
        ...prev,
        knownConditions: exists
          ? prev.knownConditions.filter((c) => c !== condition)
          : [...prev.knownConditions, condition],
      };
    });
  };

  const handleNext = (e) => {
    e?.preventDefault();
    setError(null);
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (isLoadingProfile || profileLoadError) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        bloodGroup: formData.bloodGroup || null,
        heightCm: formData.heightCm === '' ? null : Number(formData.heightCm),
        weightKg: formData.weightKg === '' ? null : Number(formData.weightKg),
        bmi: calculatedBmi,
        smokingStatus: formData.smokingStatus,
        physicalActivityDays: formData.physicalActivityDays === '' ? null : Number(formData.physicalActivityDays),
        knownConditions: formData.knownConditions,
        allergies: formData.allergies.trim() || null,
        currentMedications: formData.currentMedications.trim() || null,
        familyHistory: formData.familyHistory.trim() || null,
        systolicBp: formData.systolicBp === '' ? null : Number(formData.systolicBp),
        diastolicBp: formData.diastolicBp === '' ? null : Number(formData.diastolicBp),
        fastingGlucose: formData.fastingGlucose === '' ? null : Number(formData.fastingGlucose),
        totalCholesterol: formData.totalCholesterol === '' ? null : Number(formData.totalCholesterol),
        hdl: formData.hdl === '' ? null : Number(formData.hdl),
        ldl: formData.ldl === '' ? null : Number(formData.ldl),
        emergencyContact: formData.emergencyContactName
          ? { name: formData.emergencyContactName, phone: formData.emergencyContactPhone }
          : null,
      };

      const updatedUser = await updateProfile(payload);
      if (!updatedUser) throw new Error('Your profile was not saved. Please sign in again.');
      setSuccess(updatedUser?.isRealBackend
        ? 'Your profile was saved to your CarePulse account.'
        : 'Your profile was saved in this browser only.');
    } catch (err) {
      setError(err.message || 'Failed to save health profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    handleCompleteOnboarding();
  };

  const commonConditions = [
    'Hypertension / Elevated BP',
    'Pre-Diabetes / High Glucose',
    'High Cholesterol',
    'Asthma / Respiratory',
    'Thyroid Disorder',
    'Family History of Heart Disease',
    'None / Healthy Baseline',
  ];

  return (
    <div className="onboarding-page-container">
      <div className="container onboarding-content-wrapper">
        <motion.div
          className="onboarding-card"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="onboarding-header">
            <div className="onboarding-brand-badge">
              <HeartPulseIcon size={18} className="brand-icon" />
              <span>CarePulse • Baseline Clinical Setup</span>
            </div>
            <h1 className="onboarding-title">
              {user?.hasCompletedOnboarding ? 'Edit your patient profile' : `Welcome, ${user?.fullName || 'Patient'}`}
            </h1>
            <p className="onboarding-subtitle">
              Configure your baseline biometric parameters to enable tailored machine learning risk predictions and clinical telemetry tracking.
            </p>

            {/* Stepper Progress Bar */}
            <div className="onboarding-stepper">
              <div className="stepper-bar-track">
                <div
                  className="stepper-bar-fill"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                />
              </div>
              <div className="stepper-points">
                <div className={`stepper-point ${step >= 1 ? 'point-active' : ''}`}>
                  <span className="point-number">1</span>
                  <span className="point-label">Physical Profile</span>
                </div>
                <div className={`stepper-point ${step >= 2 ? 'point-active' : ''}`}>
                  <span className="point-number">2</span>
                  <span className="point-label">Lifestyle &amp; History</span>
                </div>
                <div className={`stepper-point ${step >= 3 ? 'point-active' : ''}`}>
                  <span className="point-number">3</span>
                  <span className="point-label">Biometric Vitals</span>
                </div>
              </div>
            </div>
          </div>

            {error && (
            <div className="auth-error-banner" role="alert">
              <AlertTriangleIcon size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success-banner" role="status">
              <ShieldCheckIcon size={16} />
              <span>{success}</span>
              <button type="button" className="auth-inline-link" onClick={() => navigate('/app/dashboard')}>
                Continue to dashboard
              </button>
            </div>
          )}

          {/* Step 1: Physical Profile */}
          {step === 1 && (
            <motion.div
              key="step-1"
              className="onboarding-step-body"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="step-heading-group">
                <div className="step-icon-wrap">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h2 className="step-title">Personal Biometric Baseline</h2>
                  <p className="step-desc">Enter your primary demographic and physical measures.</p>
                </div>
              </div>

              <div className="onboarding-form-grid">
                <div className="form-group">
                  <label htmlFor="onb-date-of-birth" className="form-label">
                    Date of Birth (Optional)
                  </label>
                  <input
                    id="onb-date-of-birth"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    className="auth-input-control"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="onb-gender" className="form-label">
                    Biological Sex / Gender
                  </label>
                  <select
                    id="onb-gender"
                    className="auth-input-control auth-select-control"
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                  >
                    <option value="">Not provided</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Prefer not to specify</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="onb-blood" className="form-label">
                    Blood Group
                  </label>
                  <select
                    id="onb-blood"
                    className="auth-input-control auth-select-control"
                    value={formData.bloodGroup}
                    onChange={(e) => handleChange('bloodGroup', e.target.value)}
                  >
                    <option value="">Not provided</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="onb-height" className="form-label">
                    Height (cm)
                  </label>
                  <input
                    id="onb-height"
                    type="number"
                    min="50"
                    max="260"
                    className="auth-input-control"
                    value={formData.heightCm}
                    onChange={(e) => handleChange('heightCm', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="onb-weight" className="form-label">
                    Weight (kg)
                  </label>
                  <input
                    id="onb-weight"
                    type="number"
                    min="20"
                    max="300"
                    step="0.5"
                    className="auth-input-control"
                    value={formData.weightKg}
                    onChange={(e) => handleChange('weightKg', e.target.value)}
                    required
                  />
                </div>

                {/* Dynamic BMI readout card */}
                <div className="form-group bmi-live-card">
                  <div className="bmi-live-header">
                    <ScaleIcon size={16} />
                    <span>Calculated Body Mass Index (BMI)</span>
                  </div>
                  <div className="bmi-live-body">
                    <span className="bmi-live-value">{calculatedBmi ?? 'Not recorded'}</span>
                    <span className={`bmi-live-pill pill-${bmiCategory.color}`}>
                      {bmiCategory.label}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Lifestyle & History */}
          {step === 2 && (
            <motion.div
              key="step-2"
              className="onboarding-step-body"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="step-heading-group">
                <div className="step-icon-wrap">
                  <ActivityIcon size={20} />
                </div>
                <div>
                  <h2 className="step-title">Habits &amp; Known Health History</h2>
                  <p className="step-desc">Helps calibrate behavioral risk weightings in the prediction algorithms.</p>
                </div>
              </div>

              <div className="onboarding-form-grid">
                <div className="form-group">
                  <label htmlFor="onb-activity" className="form-label">
                    Physical Exercise (Days / Week)
                  </label>
                  <input
                    id="onb-activity"
                    type="range"
                    min="0"
                    max="7"
                    step="0.5"
                    className="auth-range-control"
                    value={formData.physicalActivityDays === '' ? 0 : formData.physicalActivityDays}
                    onChange={(e) => handleChange('physicalActivityDays', e.target.value)}
                  />
                  <div className="range-value-label">
                    <span>{formData.physicalActivityDays === '' ? 'Not recorded' : `${formData.physicalActivityDays} days per week`}</span>
                    <span className="range-hint">
                      {formData.physicalActivityDays >= 3 ? 'Active Routine' : 'Moderate / Sedentary'}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Smoking Status</label>
                  <div className="toggle-button-group">
                    <button
                      type="button"
                      className={`btn-toggle-option ${formData.smokingStatus === false ? 'toggle-active' : ''}`}
                      onClick={() => handleChange('smokingStatus', false)}
                    >
                      Non-Smoker
                    </button>
                    <button
                      type="button"
                      className={`btn-toggle-option ${formData.smokingStatus === true ? 'toggle-active' : ''}`}
                      onClick={() => handleChange('smokingStatus', true)}
                    >
                      Current Smoker
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group conditions-select-group">
                <label className="form-label">Known Conditions &amp; Family Risk History</label>
                <div className="conditions-chips-grid">
                  {commonConditions.map((cond) => {
                    const isSelected = formData.knownConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        className={`condition-chip ${isSelected ? 'chip-selected' : ''}`}
                        onClick={() => handleConditionToggle(cond)}
                      >
                        <ShieldCheckIcon size={14} />
                        <span>{cond}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="onboarding-form-grid">
                <div className="form-group">
                  <label htmlFor="onb-allergies" className="form-label">Allergies (Optional)</label>
                  <input
                    id="onb-allergies"
                    type="text"
                    className="auth-input-control"
                    placeholder="Not provided"
                    value={formData.allergies}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="onb-medications" className="form-label">Current Medications (Optional)</label>
                  <input
                    id="onb-medications"
                    type="text"
                    className="auth-input-control"
                    placeholder="Not provided"
                    value={formData.currentMedications}
                    onChange={(e) => handleChange('currentMedications', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="onb-family-history" className="form-label">Family History Notes (Optional)</label>
                  <input
                    id="onb-family-history"
                    type="text"
                    className="auth-input-control"
                    placeholder="Not provided"
                    value={formData.familyHistory}
                    onChange={(e) => handleChange('familyHistory', e.target.value)}
                  />
                </div>
              </div>

              <div className="dual-form-row">
                <div className="form-group flex-1">
                  <label htmlFor="onb-em-name" className="form-label">
                    Emergency Contact Name (Optional)
                  </label>
                  <input
                    id="onb-em-name"
                    type="text"
                    className="auth-input-control"
                    placeholder="e.g. Sarah Doe"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <label htmlFor="onb-em-phone" className="form-label">
                    Emergency Contact Phone (Optional)
                  </label>
                  <input
                    id="onb-em-phone"
                    type="tel"
                    className="auth-input-control"
                    placeholder="+1 (555) 000-0000"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Biometric Vitals */}
          {step === 3 && (
            <motion.div
              key="step-3"
              className="onboarding-step-body"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="step-heading-group">
                <div className="step-icon-wrap">
                  <DropletIcon size={20} />
                </div>
                <div>
                  <h2 className="step-title">Initial Baseline Vitals (Optional / Approximate)</h2>
                  <p className="step-desc">You can adjust or refine these anytime in the Disease Risk ML Studio.</p>
                </div>
              </div>

              <div className="onboarding-form-grid vitals-3col-grid">
                <div className="form-group">
                  <label htmlFor="onb-sys" className="form-label">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    id="onb-sys"
                    type="number"
                    min="80"
                    max="220"
                    className="auth-input-control"
                    value={formData.systolicBp}
                    onChange={(e) => handleChange('systolicBp', e.target.value)}
                  />
                  <span className="input-helper-text">Normal: 90 - 120 mmHg</span>
                </div>

                <div className="form-group">
                  <label htmlFor="onb-dia" className="form-label">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    id="onb-dia"
                    type="number"
                    min="50"
                    max="140"
                    className="auth-input-control"
                    value={formData.diastolicBp}
                    onChange={(e) => handleChange('diastolicBp', e.target.value)}
                  />
                  <span className="input-helper-text">Normal: 60 - 80 mmHg</span>
                </div>

                <div className="form-group">
                  <label htmlFor="onb-gluc" className="form-label">
                    Fasting Glucose (mg/dL)
                  </label>
                  <input
                    id="onb-gluc"
                    type="number"
                    min="50"
                    max="350"
                    className="auth-input-control"
                    value={formData.fastingGlucose}
                    onChange={(e) => handleChange('fastingGlucose', e.target.value)}
                  />
                  <span className="input-helper-text">Normal: 70 - 99 mg/dL</span>
                </div>

                <div className="form-group">
                  <label htmlFor="onb-chol" className="form-label">
                    Total Cholesterol (mg/dL)
                  </label>
                  <input
                    id="onb-chol"
                    type="number"
                    min="100"
                    max="400"
                    className="auth-input-control"
                    value={formData.totalCholesterol}
                    onChange={(e) => handleChange('totalCholesterol', e.target.value)}
                  />
                  <span className="input-helper-text">Desirable: &lt; 200 mg/dL</span>
                </div>

                <div className="form-group">
                  <label htmlFor="onb-hdl" className="form-label">
                    HDL Cholesterol (mg/dL)
                  </label>
                  <input
                    id="onb-hdl"
                    type="number"
                    min="20"
                    max="120"
                    className="auth-input-control"
                    value={formData.hdl}
                    onChange={(e) => handleChange('hdl', e.target.value)}
                  />
                  <span className="input-helper-text">Protective: &gt; 50 mg/dL</span>
                </div>

                <div className="form-group">
                  <label htmlFor="onb-ldl" className="form-label">
                    LDL Cholesterol (mg/dL)
                  </label>
                  <input
                    id="onb-ldl"
                    type="number"
                    min="40"
                    max="300"
                    className="auth-input-control"
                    value={formData.ldl}
                    onChange={(e) => handleChange('ldl', e.target.value)}
                  />
                  <span className="input-helper-text">Optimal: &lt; 100 mg/dL</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Button Controls */}
          {profileLoadError && (
            <div className="onboarding-actions-footer">
              <button type="button" className="btn-onboarding-next" onClick={() => { loadedUserId.current = null; setError(null); setProfileLoadError(false); setProfileLoadAttempt((attempt) => attempt + 1); }}>
                Retry loading saved profile
              </button>
            </div>
          )}
          <div className="onboarding-actions-footer">
            {step > 1 ? (
              <button
                type="button"
                className="btn-onboarding-back"
                onClick={handleBack}
                disabled={isSubmitting || isLoadingProfile || profileLoadError}
              >
                <ArrowLeftIcon size={16} />
                <span>Previous</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-onboarding-skip"
                onClick={handleSkip}
                disabled={isSubmitting || isLoadingProfile || profileLoadError}
              >
                <span>Skip to Workspace</span>
              </button>
            )}

            <button
              type="button"
              className="btn-onboarding-next"
              onClick={handleNext}
              disabled={isSubmitting || isLoadingProfile || profileLoadError}
            >
              <span>{isLoadingProfile ? 'Loading Saved Profile...' : isSubmitting ? 'Saving Profile...' : step === 3 ? 'Save Profile' : 'Continue'}</span>
              <ArrowRightIcon size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
