import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { predictDiseaseRisk, getDiseaseModelsMetadata } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DiseaseSelector } from './DiseaseSelector';
import { BiometricInputStudio } from './BiometricInputStudio';
import { ProcessingTelemetry } from './ProcessingTelemetry';
import { PredictionResultPanel } from './PredictionResultPanel';
import { FeatureDriversBreakdown } from './FeatureDriversBreakdown';
import { LongitudinalComparison } from './LongitudinalComparison';
import { PreventiveActionPlan } from './PreventiveActionPlan';
import {
  BrainIcon,
  ShieldCheckIcon,
  InfoIcon,
} from '../Icons';

const EXAMPLE_BIOMETRICS = {
  age: 44,
  gender: 'male',
  bmi: 26.4,
  fastingGlucose: 108,
  systolicBp: 128,
  diastolicBp: 82,
  totalCholesterol: 195,
  hdl: 48,
  ldl: 118,
  smokingStatus: false,
  physicalActivityDays: 3.5,
  familyHistory: false,
};

const BIOMETRIC_RANGES = {
  age: [18, 90],
  bmi: [16, 42],
  fastingGlucose: [65, 240],
  systolicBp: [90, 190],
  diastolicBp: [55, 120],
  totalCholesterol: [120, 320],
  hdl: [20, 90],
  ldl: [50, 220],
  physicalActivityDays: [0, 7],
};

const MODEL_INPUTS = {
  diabetes: ['age', 'bmi', 'fastingGlucose', 'systolicBp', 'physicalActivityDays', 'familyHistory'],
  cardiovascular: ['age', 'gender', 'bmi', 'systolicBp', 'diastolicBp', 'totalCholesterol', 'hdl', 'ldl', 'smokingStatus', 'physicalActivityDays'],
  hypertension: ['age', 'bmi', 'systolicBp', 'diastolicBp', 'smokingStatus', 'physicalActivityDays', 'familyHistory'],
};

export function DiseasePredictionSuite({ onNavigateToDoctorBrief }) {
  const shouldReduceMotion = useReducedMotion();
  const { user, saveAssessment } = useAuth();
  const models = getDiseaseModelsMetadata();
  const [selectedModelId, setSelectedModelId] = useState('diabetes');

  const getUserBiometrics = useCallback(() => {
    if (!user?.isDemo && !user) return Object.fromEntries(Object.keys(EXAMPLE_BIOMETRICS).map((key) => [key, null]));
    const examples = user?.isDemo ? EXAMPLE_BIOMETRICS : {};
    return {
      age: user.profile?.age ?? examples.age ?? null,
      gender: user.profile?.gender ? user.profile.gender.toLowerCase() : examples.gender ?? null,
      bmi: user.profile?.bmi ?? examples.bmi ?? null,
      fastingGlucose: user.vitals?.fastingGlucose ?? examples.fastingGlucose ?? null,
      systolicBp: user.vitals?.systolicBp ?? examples.systolicBp ?? null,
      diastolicBp: user.vitals?.diastolicBp ?? examples.diastolicBp ?? null,
      totalCholesterol: user.vitals?.totalCholesterol ?? examples.totalCholesterol ?? null,
      hdl: user.vitals?.hdl ?? examples.hdl ?? null,
      ldl: user.vitals?.ldl ?? examples.ldl ?? null,
      smokingStatus: user.profile?.smokingStatus ?? examples.smokingStatus ?? null,
      physicalActivityDays: user.profile?.physicalActivityDays ?? examples.physicalActivityDays ?? null,
      familyHistory: user.profile?.familyHistory ?? examples.familyHistory ?? null,
    };
  }, [user]);

  const [biometrics, setBiometrics] = useState(getUserBiometrics);
  const [isProcessing, setIsProcessing] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [notification, setNotification] = useState(null);
  const [validationError, setValidationError] = useState('');
  const resultRef = useRef(null);

  const exampleFields = Object.entries({
    age: user?.profile?.age,
    gender: user?.profile?.gender,
    bmi: user?.profile?.bmi,
    fastingGlucose: user?.vitals?.fastingGlucose,
    systolicBp: user?.vitals?.systolicBp,
    diastolicBp: user?.vitals?.diastolicBp,
    totalCholesterol: user?.vitals?.totalCholesterol,
    hdl: user?.vitals?.hdl,
    ldl: user?.vitals?.ldl,
    smokingStatus: user?.profile?.smokingStatus,
    physicalActivityDays: user?.profile?.physicalActivityDays,
    familyHistory: user?.profile?.familyHistory,
  }).filter(([, value]) => value == null).map(([key]) => key);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setBiometrics(getUserBiometrics());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, getUserBiometrics]);

  const handleSelectModel = (modelId) => {
    setSelectedModelId(modelId);
    setPredictionResult(null);
    setIsSaved(false);
    setValidationError('');
  };

  const handleResetToProfile = () => {
    const baseline = getUserBiometrics();
    setBiometrics(baseline);
    setValidationError('');
    setNotification({
      type: 'info',
    message: user?.isDemo
      ? 'Inputs reset to saved values and labelled demo examples.'
      : 'Inputs reset to saved values; missing values remain unrecorded.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRunPrediction = async () => {
    const requiredInputs = MODEL_INPUTS[selectedModelId] || [];
    const invalidInput = requiredInputs.find((key) => {
      if (key === 'gender') return !['male', 'female'].includes(biometrics[key]);
      if (key === 'smokingStatus' || key === 'familyHistory') return typeof biometrics[key] !== 'boolean';
      const [min, max] = BIOMETRIC_RANGES[key];
      return !Number.isFinite(Number(biometrics[key])) || Number(biometrics[key]) < min || Number(biometrics[key]) > max;
    });

    if (invalidInput) {
      setValidationError('Review the highlighted assessment inputs and make sure each value is within its displayed range.');
      return;
    }

    setValidationError('');
    setIsProcessing(true);
    setPredictionResult(null);
    setIsSaved(false);

    try {
      // Simulate minimum pipeline execution for clinical telemetry animation
      const [result] = await Promise.all([
        predictDiseaseRisk(biometrics, selectedModelId),
        new Promise((resolve) => setTimeout(resolve, 1400)),
      ]);

      if (!result || typeof result.riskScore !== 'number' || !Number.isFinite(result.riskScore)) {
        throw new Error('The prediction response did not contain a valid risk score.');
      }

      setPredictionResult(result);

      // Scroll to result smoothly
      setTimeout(() => {
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      console.error('Failed to run disease prediction:', err);
      setNotification({
        type: 'error',
        message: 'No valid risk estimate was returned. Check the service response and input values, then try again.',
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToRecords = () => {
    setIsSaved(true);
    if (saveAssessment && predictionResult) {
      saveAssessment(predictionResult);
    }
    setNotification({
      type: 'success',
      message: 'Assessment saved in this browser.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const activeModelMeta = models.find((m) => m.id === selectedModelId) || {};

  return (
    <section
      id="disease-prediction"
      className="disease-prediction-section"
      aria-label="Disease Risk Prediction Suite (ML Engine)"
    >
      <div className="container prediction-container">
        {/* Floating Notification Toast */}
        {notification && (
          <motion.div
            className={`dashboard-toast toast-${notification.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="status"
          >
            <ShieldCheckIcon size={18} />
            <span>{notification.message}</span>
          </motion.div>
        )}

        {/* Section Master Header */}
        <div className="prediction-suite-header">
          <div className="suite-badge-row">
            <div className="section-badge badge-cyan">
              <BrainIcon size={15} />
              <span>Prediction Studio</span>
            </div>
            <div className="dev-preview-tag">
              <InfoIcon size={13} />
              <span>Prototype risk assessment</span>
            </div>
          </div>

          <h2 className="suite-main-headline">
            Disease risk estimates
          </h2>
          <p className="suite-main-desc">
            Explore estimates generated from selected health indicators. Review every input before running an assessment.
          </p>
        </div>

        {/* 1. Target Disease Model Selector */}
        <DiseaseSelector
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
          disabled={isProcessing}
        />

        {/* 2. Biometric Input Studio */}
        <BiometricInputStudio
          selectedModelId={selectedModelId}
          values={biometrics}
          exampleFields={exampleFields}
          isDemo={user?.isDemo}
          onChange={(nextValues) => {
            setBiometrics(nextValues);
            setValidationError('');
          }}
          onResetToProfile={handleResetToProfile}
          onSubmit={handleRunPrediction}
          isProcessing={isProcessing}
          validationError={validationError}
        />

        {/* 3. Processing State Telemetry Animation */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <ProcessingTelemetry diseaseTitle={activeModelMeta.title} />
            </motion.div>
          )}
        </AnimatePresence>

        {!predictionResult && !isProcessing && (
          <div className="prediction-empty-state" role="status">
            <span className="prediction-empty-mark"><InfoIcon size={18} /></span>
            <div>
              <strong>No assessment has been run yet</strong>
              <p>Choose a condition, check the input sources, then run an assessment to see its estimate.</p>
            </div>
          </div>
        )}

        {/* 4. Complete Prediction Result Experience */}
        <AnimatePresence>
          {predictionResult && !isProcessing && (
            <motion.div
              ref={resultRef}
              className="prediction-result-flow-container"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              {/* Main Result Score Panel */}
              <PredictionResultPanel
                result={predictionResult}
                onReset={() => {
                  setPredictionResult(null);
                  setIsSaved(false);
                }}
                onSaveToRecords={handleSaveToRecords}
                isSaved={isSaved}
              />

              {/* Feature Drivers Attribution Breakdown */}
              <FeatureDriversBreakdown
                featureContributions={predictionResult.featureContributions || []}
              />

              {/* Longitudinal Comparison with Previous Assessment */}
              <LongitudinalComparison
                previousAssessment={predictionResult.previousAssessment}
                currentScore={predictionResult.riskScore}
              />

              {/* Evidence-Informed Preventive Care Action Plan */}
              <PreventiveActionPlan
                recommendations={predictionResult.recommendations || []}
                onExportBrief={onNavigateToDoctorBrief}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
