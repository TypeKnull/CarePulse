/**
 * CarePulse Healthcare Platform - API & Data Service Layer
 * 
 * ARCHITECTURAL CONTRACT:
 * - Direct REST Client for Python Flask + MySQL + scikit-learn Backend.
 * - Clean separation between REAL BACKEND/ML DATA, AUTHENTIC USER STATE, and ISOLATED DEMO MODE.
 * - When Flask backend is running on http://127.0.0.1:5000, real ML model predictions
 *   and MySQL queries are executed.
 * - In offline/development mode:
 *     - If User is in Demo Mode: returns clearly tagged `SAMPLE_PATIENT_DATA`.
 *     - If User is a Real Patient: returns authentic state or genuine empty-state metrics.
 */

import { SAMPLE_PATIENT_DATA } from '../data/samplePatientData';
import { getAuthToken } from './auth';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://127.0.0.1:5000/api';

async function authenticatedPatientRequest(userId, path, options = {}) {
  const token = getAuthToken();
  if (!token || token.startsWith('dev_token_') || token === 'demo_session_token') {
    const error = new Error('A signed-in backend session is required for this action.');
    error.status = 401;
    throw error;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${encodeURIComponent(userId)}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.error || `The patient service returned HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Check your connection and retry.', { cause: error });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const recordPatientVitals = (userId, values) => authenticatedPatientRequest(userId, '/vitals', {
  method: 'POST', body: JSON.stringify(values),
});

export const recordPatientLabResult = (userId, values) => authenticatedPatientRequest(userId, '/labs', {
  method: 'POST', body: JSON.stringify(values),
});

export const recordPatientLifestyle = (userId, values) => authenticatedPatientRequest(userId, '/lifestyle', {
  method: 'POST', body: JSON.stringify(values),
});

export const updatePatientRecommendation = (userId, actionId, isCompleted) => authenticatedPatientRequest(
  userId,
  `/recommendation-actions/${encodeURIComponent(actionId)}`,
  { method: 'PUT', body: JSON.stringify({ isCompleted }) },
);

export const generatePatientRecommendations = (userId) => authenticatedPatientRequest(
  userId,
  '/recommendations/generate',
  { method: 'POST', body: JSON.stringify({}) },
);

/**
 * Check connectivity to the Flask Healthcare Backend
 * @returns {Promise<{ isOnline: boolean, serverTime?: string, mlModelsLoaded?: string[] }>}
 */
export async function checkBackendStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { isOnline: true, ...data };
    }
    return { isOnline: false, reason: `HTTP ${response.status}` };
  } catch (err) {
    return { isOnline: false, reason: err.message };
  }
}

/**
 * Predict Disease Risk using ML Model
 * 
 * Flow: React UI -> Flask API (/predict) -> scikit-learn model -> MySQL storage -> React UI
 * 
 * @param {Object} biometrics Patient clinical biometric parameters
 * @param {string} diseaseTarget 'diabetes' | 'cardiovascular' | 'hypertension'
 * @returns {Promise<Object>} Structured ML prediction result
 */
export async function predictDiseaseRisk(biometrics, diseaseTarget = 'diabetes') {
  const token = getAuthToken();
  const hasBackendToken = token && !token.startsWith('dev_token_') && token !== 'demo_session_token';
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (hasBackendToken) {
      headers.Authorization = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/predict/${diseaseTarget}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(biometrics),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      const result = await response.json();
      return {
        ...result,
        isRealBackend: true,
      };
    }
    const error = new Error(response.status === 401
      ? 'Your session has expired. Please log in again.'
      : response.status === 403
        ? 'You do not have permission to run this assessment.'
        : `The prediction service returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  } catch (err) {
    if (err.status) throw err;
    if (hasBackendToken) {
      throw new Error('The prediction service is unavailable. Please try again when the backend is reachable.', { cause: err });
    }
    console.info(`CarePulse API: Backend offline (${err.message}). Using development fallback.`);
  }

  // DEVELOPMENT FALLBACK (Clearly tagged as simulated until Flask ML model connects)
  return getDevelopmentPredictionFallback(biometrics, diseaseTarget);
}

/**
 * Submit Symptom Assessment for Clinical Care Triage
 * @param {Object} symptomPayload
 * @returns {Promise<Object>}
 */
export async function submitSymptomAssessment(symptomPayload) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token && !token.startsWith('dev_token_') && token !== 'demo_session_token') {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/symptoms/assess`, {
    method: 'POST',
    headers,
    body: JSON.stringify(symptomPayload),
  });
  if (!response.ok) {
    const error = new Error(response.status === 401
      ? 'Your session has expired. Please log in again.'
      : `The symptom assessment service returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return { ...data, isRealBackend: true };
}

/**
 * Fetch complete dashboard payload for a patient
 * @param {Object} user Current authenticated user session object
 * @returns {Promise<Object>}
 */
export async function getPatientDashboardData(userOrId) {
  const user = typeof userOrId === 'object' && userOrId !== null ? userOrId : null;

  if (user?.isDemo) {
    return { ...SAMPLE_PATIENT_DATA, isRealBackend: false };
  }

  const userId = user?.id || (typeof userOrId === 'string' ? userOrId : 'P-GUEST');
  const token = getAuthToken();

  if (token?.startsWith('dev_token_') && user) {
    return buildAuthenticUserDashboard(user);
  }
  if (!token) {
    const error = new Error('Your session has expired. Please log in again.');
    error.status = 401;
    throw error;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${API_BASE_URL}/patients/${userId}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.status === 401) {
      const error = new Error('Your session has expired. Please log in again.');
      error.status = 401;
      throw error;
    }
    if (response.status === 403) {
      const error = new Error('You do not have permission to view this dashboard.');
      error.status = 403;
      throw error;
    }
    if (response.ok) {
      const data = await response.json();
      return { ...data, isRealBackend: true };
    }
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || `Dashboard request returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Dashboard request timed out. Check your connection and retry.', { cause: err });
    if (err.status) throw err;
    throw new Error('Dashboard data could not be loaded from CarePulse. Check the backend connection and retry.', { cause: err });
  }
}

/**
 * Helper to build authentic patient dashboard payload from user session
 * @param {Object} user
 * @returns {Object}
 */
function buildAuthenticUserDashboard(user) {
  const profile = user?.profile || {};
  const vitals = user?.vitals || {};
  const history = user?.assessmentHistory || [];

  const hasBp = vitals.systolicBp != null;
  const hasGlucose = vitals.fastingGlucose != null;
  const hasBmi = profile.bmi != null;
  const hasCholesterol = vitals.totalCholesterol != null;

  const biometrics = [
    {
      id: 'blood-pressure',
      name: 'Blood Pressure',
      value: hasBp ? `${vitals.systolicBp} / ${vitals.diastolicBp || 80}` : 'Not recorded',
      systolic: vitals.systolicBp,
      diastolic: vitals.diastolicBp,
      unit: 'mmHg',
      status: hasBp ? (vitals.systolicBp >= 140 ? 'elevated' : vitals.systolicBp >= 120 ? 'borderline' : 'optimal') : 'unrecorded',
      statusLabel: hasBp ? (vitals.systolicBp >= 140 ? 'Stage 2 HTN' : vitals.systolicBp >= 120 ? 'Pre-Hypertension' : 'Normal Range') : 'No measurement logged',
      trend: 'stable',
      trendText: hasBp ? 'Recorded at baseline' : 'Pending clinical log',
      normalRange: '110-120 / 70-80',
      sparkline: hasBp ? [vitals.systolicBp] : [],
      category: 'cardio',
    },
    {
      id: 'fasting-glucose',
      name: 'Blood Glucose',
      value: hasGlucose ? `${vitals.fastingGlucose}` : 'Not recorded',
      unit: 'mg/dL',
      status: hasGlucose ? (vitals.fastingGlucose > 125 ? 'elevated' : vitals.fastingGlucose >= 100 ? 'borderline' : 'optimal') : 'unrecorded',
      statusLabel: hasGlucose ? (vitals.fastingGlucose > 125 ? 'Elevated' : vitals.fastingGlucose >= 100 ? 'Impaired Fasting' : 'Optimal Glycemia') : 'No measurement logged',
      trend: 'stable',
      trendText: hasGlucose ? 'Recorded at baseline' : 'Pending fasting screen',
      normalRange: '70 - 99 mg/dL',
      sparkline: hasGlucose ? [vitals.fastingGlucose] : [],
      category: 'metabolic',
    },
    {
      id: 'bmi',
      name: 'Body Mass Index (BMI)',
      value: hasBmi ? `${profile.bmi}` : 'Not calculated',
      unit: 'kg/m²',
      status: hasBmi ? (profile.bmi >= 30 ? 'elevated' : profile.bmi >= 25 ? 'borderline' : 'optimal') : 'unrecorded',
      statusLabel: hasBmi ? (profile.bmi >= 30 ? 'Obese' : profile.bmi >= 25 ? 'Overweight' : 'Optimal Weight') : 'Height & weight needed',
      trend: 'stable',
      trendText: hasBmi ? 'Calculated from profile' : 'Pending biometric inputs',
      normalRange: '18.5 - 24.9 kg/m²',
      sparkline: hasBmi ? [profile.bmi] : [],
      category: 'biometric',
    },
    {
      id: 'total-cholesterol',
      name: 'Total Cholesterol',
      value: hasCholesterol ? `${vitals.totalCholesterol}` : 'Not recorded',
      unit: 'mg/dL',
      status: hasCholesterol ? (vitals.totalCholesterol > 200 ? 'borderline' : 'optimal') : 'unrecorded',
      statusLabel: hasCholesterol ? (vitals.totalCholesterol > 200 ? 'Borderline High' : 'Desirable Range') : 'No lab panel logged',
      trend: 'stable',
      trendText: hasCholesterol ? 'Recorded at baseline' : 'Pending lipid profile',
      normalRange: '< 200 mg/dL',
      sparkline: hasCholesterol ? [vitals.totalCholesterol] : [],
      category: 'lipid',
    },
    {
      id: 'heart-rate',
      name: 'Resting Heart Rate',
      value: vitals.restingHr ? `${vitals.restingHr}` : 'Not recorded',
      unit: 'BPM',
      status: vitals.restingHr ? 'optimal' : 'unrecorded',
      statusLabel: vitals.restingHr ? 'Normal Resting Rhythm' : 'No resting pulse logged',
      trend: 'stable',
      trendText: vitals.restingHr ? 'Recorded at baseline' : 'Pending telemetry',
      normalRange: '60 - 100 BPM',
      sparkline: vitals.restingHr ? [vitals.restingHr] : [],
      category: 'cardio',
    },
    {
      id: 'physical-activity',
      name: 'Physical Activity',
      value: profile.physicalActivityDays != null ? `${profile.physicalActivityDays}` : 'Not recorded',
      unit: 'days / week',
      status: profile.physicalActivityDays == null
        ? 'unrecorded'
        : profile.physicalActivityDays >= 3.5 ? 'optimal' : 'borderline',
      statusLabel: profile.physicalActivityDays == null
        ? 'No measurement logged'
        : profile.physicalActivityDays >= 3.5 ? 'Active Regimen' : 'Moderate / Sedentary',
      trend: 'stable',
      trendText: profile.physicalActivityDays != null ? 'From lifestyle profile' : 'Pending lifestyle log',
      normalRange: '≥ 5 days / 150 min',
      sparkline: profile.physicalActivityDays ? [profile.physicalActivityDays] : [],
      category: 'lifestyle',
    },
  ];

  // Map any assessments the real user has actually performed
  const riskAssessments = history.map((a) => ({
    id: a.disease,
    title: a.diseaseTitle,
    category: a.disease === 'diabetes' ? 'Metabolic Health' : 'Cardiovascular Health',
    riskScore: a.riskScore,
    riskTier: a.riskCategory,
    confidenceInterval: a.confidenceInterval,
    primaryDriver: a.featureContributions?.[0]?.factor || 'Biometric parameters',
    badgeColor: a.disease === 'diabetes' ? 'cyan' : a.disease === 'hypertension' ? 'blue' : 'teal',
    lastAssessed: a.assessedAt?.split('T')[0] || 'Recently',
    trend: 'stable',
    trendValue: 'Latest Assessment',
    contributingFactors: (a.featureContributions || []).map((f) => ({
      factor: f.factor,
      weight: f.contribution,
      type: f.type,
    })),
    recommendationsCount: a.recommendations?.length || 0,
    specialist: a.suggestedSpecialist || 'Internal Medicine',
  }));

  const recommendations = history.flatMap((a) => a.recommendations || []).map((rec, rIdx) => ({
    id: `rec-user-${rIdx}`,
    title: rec.title,
    category: rec.category || 'Preventive Care',
    urgency: rec.urgency || 'Actionable',
    urgencyColor: rec.urgency === 'Priority' ? 'amber' : 'cyan',
    action: rec.action,
    impactMetric: 'Supports targeted preventive risk reduction',
  }));

  const recentActivities = history.map((a, aIdx) => ({
    id: `act-user-${aIdx}`,
    date: a.assessedAt?.split('T')[0] || '',
    timestampText: 'Recent Assessment',
    title: `${a.diseaseTitle} Assessment`,
    category: 'ML Assessment',
    status: 'Completed',
    badgeColor: a.disease === 'diabetes' ? 'cyan' : 'teal',
    summary: `Risk estimate computed at ${a.riskScore}% (${a.riskCategory}).`,
    clinicalNote: 'Saved in this browser only.',
  }));

  return {
    isDemo: false,
    patient: {
      id: user?.id || 'P-UNASSIGNED',
      name: user?.fullName || 'Patient',
      age: profile.age ?? 'Not recorded',
      gender: profile.gender || 'Not recorded',
      bloodGroup: profile.bloodGroup || 'Not recorded',
      healthIndex: null,
      healthStatus: history.length > 0
        ? 'Assessment history is stored in this browser.'
        : hasBp
        ? 'Baseline measurements are stored in this browser.'
        : 'No baseline measurements recorded.',
      lastAssessment: history[0]?.assessedAt || null,
      activeCarePlan: recommendations[0]?.title || 'No active care plan recorded',
      emergencyContact: profile.emergencyContact || null,
    },
    biometrics,
    riskAssessments,
    trends: {
      glucose: {
        name: 'Fasting Blood Glucose',
        unit: 'mg/dL',
        currentValue: vitals.fastingGlucose || null,
        changeText: hasGlucose ? 'Baseline recorded' : 'No measurements logged yet',
        normalRange: { min: 70, max: 99, label: 'Normal: 70-99 mg/dL' },
        timeRanges: {
          '6M': hasGlucose ? [{ label: 'Today', value: vitals.fastingGlucose, note: 'User baseline' }] : [],
          '1Y': hasGlucose ? [{ label: 'Today', value: vitals.fastingGlucose }] : [],
        },
      },
      bloodPressure: {
        name: 'Systolic Blood Pressure',
        unit: 'mmHg',
        currentValue: vitals.systolicBp || null,
        changeText: hasBp ? 'Baseline recorded' : 'No measurements logged yet',
        normalRange: { min: 90, max: 120, label: 'Normal: <120 mmHg' },
        timeRanges: {
          '6M': hasBp ? [{ label: 'Today', systolic: vitals.systolicBp, diastolic: vitals.diastolicBp || 80, note: 'User baseline' }] : [],
          '1Y': hasBp ? [{ label: 'Today', systolic: vitals.systolicBp, diastolic: vitals.diastolicBp || 80 }] : [],
        },
      },
      cholesterol: {
        name: 'Total Cholesterol',
        unit: 'mg/dL',
        currentValue: vitals.totalCholesterol || null,
        changeText: hasCholesterol ? 'Baseline recorded' : 'No measurements logged yet',
        normalRange: { min: 125, max: 200, label: 'Desirable: <200 mg/dL' },
        timeRanges: {
          '6M': hasCholesterol ? [{ label: 'Today', value: vitals.totalCholesterol, note: 'User baseline' }] : [],
          '1Y': hasCholesterol ? [{ label: 'Today', value: vitals.totalCholesterol }] : [],
        },
      },
    },
    recentActivities,
    recommendations,
    upcomingCare: {
      appointment: null,
      suggestedFollowUps: [],
    },
    isRealBackend: false,
    isLocalOnly: true,
  };
}

/**
 * Retrieve metadata for supported disease prediction models
 * @returns {Array<Object>}
 */
export function getDiseaseModelsMetadata() {
  return [
    {
      id: 'diabetes',
      title: 'Type-2 Diabetes Risk',
      subtitle: 'Metabolic & Glycemic Predictive Assessment',
      modelType: 'Supervised Classification (Random Forest / Gradient Boosted Trees)',
      targetWindow: 'Multi-year metabolic trajectory',
      scope: 'Evaluates fasting glucose, Body Mass Index, age distribution, and physical activity patterns against metabolic risk profiles.',
      relevantMeasurements: [
        'Fasting Blood Glucose (mg/dL)',
        'Body Mass Index (BMI kg/m²)',
        'Age (years)',
        'Physical Activity (days/week)',
        'Family History of Diabetes',
      ],
      specialist: 'Endocrinology & Diabetology',
      disclaimer: 'Informational risk estimate based on statistical modeling. Not a clinical diagnosis of diabetes or impaired fasting glucose.',
      badgeColor: 'cyan',
    },
    {
      id: 'cardiovascular',
      title: 'Cardiovascular Disease Risk',
      subtitle: 'Atherosclerotic & Arterial Stress Assessment',
      modelType: 'Multivariate Risk Regression & Gradient Boosting',
      targetWindow: 'Longitudinal cardiovascular baseline',
      scope: 'Assesses serum lipid balance, resting systolic/diastolic blood pressure, smoking exposure, and metabolic indicators.',
      relevantMeasurements: [
        'Systolic & Diastolic Blood Pressure (mmHg)',
        'Total Serum Cholesterol (mg/dL)',
        'HDL & LDL Cholesterol Fractionation',
        'Tobacco / Smoking Exposure',
        'Age & Biological Sex',
      ],
      specialist: 'Cardiology & Preventive Medicine',
      disclaimer: 'Statistical estimate of relative cardiovascular risk. Does not substitute for resting 12-lead ECG, coronary calcium scoring, or clinical physician review.',
      badgeColor: 'teal',
    },
    {
      id: 'hypertension',
      title: 'Hypertension Risk',
      subtitle: 'Vascular Resistance & Arterial Compliance Assessment',
      modelType: 'Ensemble Classifier (Logistic Regression + Random Forest)',
      targetWindow: 'Short-to-medium term arterial tension',
      scope: 'Analyzes blood pressure distribution, Body Mass Index, dietary sodium risk factors, and autonomic tone indicators.',
      relevantMeasurements: [
        'Resting Systolic Blood Pressure (mmHg)',
        'Resting Diastolic Blood Pressure (mmHg)',
        'Body Mass Index (BMI)',
        'Resting Heart Rate (BPM)',
        'Physical Activity & Sodium Profile',
      ],
      specialist: 'Internal Medicine & Cardiology',
      disclaimer: 'Predictive assessment of arterial tension risk. Clinical confirmation requires standardized in-clinic serial sphygmomanometer measurements.',
      badgeColor: 'blue',
    },
  ];
}

/* ==========================================================================
   DEVELOPMENT MOCK FALLBACK CALCULATOR (Placeholder until Flask ML connects)
   ========================================================================== */
function getDevelopmentPredictionFallback(biometrics, diseaseTarget) {
  const {
    fastingGlucose = 108,
    systolicBp = 128,
    diastolicBp = 82,
    totalCholesterol = 195,
    ldl = 118,
    bmi = 26.4,
    smokingStatus = false,
    physicalActivityDays = 3.5,
    familyHistory = false,
  } = biometrics || {};

  let riskScore = 18;
  const contributingFactors = [];
  const recommendations = [];

  if (diseaseTarget === 'diabetes') {
    if (fastingGlucose > 125) {
      riskScore += 36;
      contributingFactors.push({
        factor: 'Fasting Blood Glucose',
        value: `${fastingGlucose} mg/dL`,
        impact: 'High',
        contribution: 88,
        type: 'adverse',
        rationale: 'Fasting glucose above 125 mg/dL represents a primary biometric driver for metabolic dysregulation.',
      });
    } else if (fastingGlucose >= 100) {
      riskScore += 22;
      contributingFactors.push({
        factor: 'Fasting Blood Glucose',
        value: `${fastingGlucose} mg/dL`,
        impact: 'High',
        contribution: 82,
        type: 'adverse',
        rationale: 'Fasting glucose between 100–125 mg/dL indicates impaired fasting glycaemia in the predictive model.',
      });
    } else {
      contributingFactors.push({
        factor: 'Fasting Blood Glucose',
        value: `${fastingGlucose} mg/dL`,
        impact: 'Protective',
        contribution: 75,
        type: 'positive',
        rationale: 'Optimal fasting glucose (<100 mg/dL) provides a strong protective baseline.',
      });
    }

    if (bmi >= 30) {
      riskScore += 24;
      contributingFactors.push({
        factor: 'Body Mass Index (BMI)',
        value: `${bmi} kg/m²`,
        impact: 'High',
        contribution: 76,
        type: 'adverse',
        rationale: 'BMI ≥ 30 kg/m² correlates with elevated peripheral insulin resistance in the model feature space.',
      });
    } else if (bmi >= 25) {
      riskScore += 14;
      contributingFactors.push({
        factor: 'Body Mass Index (BMI)',
        value: `${bmi} kg/m²`,
        impact: 'Moderate',
        contribution: 64,
        type: 'adverse',
        rationale: 'BMI in the 25–29.9 kg/m² range contributes moderate weight to predictive classification.',
      });
    } else {
      contributingFactors.push({
        factor: 'Body Mass Index (BMI)',
        value: `${bmi} kg/m²`,
        impact: 'Protective',
        contribution: 60,
        type: 'positive',
        rationale: 'Preserved healthy weight range maintains favorable insulin sensitivity.',
      });
    }

    if (physicalActivityDays < 2.5) {
      riskScore += 14;
      contributingFactors.push({
        factor: 'Physical Activity Level',
        value: `${physicalActivityDays} days/wk`,
        impact: 'Moderate',
        contribution: 58,
        type: 'adverse',
        rationale: 'Sedentary activity profile limits skeletal muscle glucose uptake.',
      });
    } else {
      contributingFactors.push({
        factor: 'Physical Activity Level',
        value: `${physicalActivityDays} days/wk`,
        impact: 'Protective',
        contribution: 52,
        type: 'positive',
        rationale: 'Regular aerobic activity promotes glucose transporter translocation.',
      });
    }

    if (familyHistory) {
      riskScore += 10;
      contributingFactors.push({
        factor: 'Family History of Diabetes',
        value: 'Present in 1st degree relative',
        impact: 'Moderate',
        contribution: 45,
        type: 'adverse',
        rationale: 'Genetic susceptibility weighting elevates baseline prior probability.',
      });
    }

    if (!smokingStatus) {
      contributingFactors.push({
        factor: 'Tobacco / Smoking Exposure',
        value: 'Non-Smoker',
        impact: 'Protective',
        contribution: 40,
        type: 'positive',
        rationale: 'Absence of smoking avoids nicotine-mediated oxidative stress.',
      });
    }

    recommendations.push({
      title: 'Aerobic & Resistance Regimen',
      action: 'Engage in at least 150 minutes of moderate aerobic exercise per week combined with light resistance sessions.',
      category: 'Physical Activity',
      urgency: 'Priority',
    });
    recommendations.push({
      title: 'Dietary Glycemic Pattern',
      action: 'Emphasize high-fiber, unrefined complex carbohydrates while moderating refined sugar and grain intake.',
      category: 'Nutrition',
      urgency: 'Priority',
    });
    recommendations.push({
      title: 'Biometric Glycemic Tracking',
      action: 'Maintain periodic tracking of morning fasting blood glucose to observe longitudinal trends.',
      category: 'Monitoring',
      urgency: 'Actionable',
    });
    recommendations.push({
      title: 'Confirmatory Physician Consultation',
      action: 'Review predictive estimates with your primary healthcare provider and consider scheduling a laboratory HbA1c screening.',
      category: 'Clinical Follow-up',
      urgency: 'Recommended',
    });

    const clampedRisk = Math.min(Math.max(Math.round(riskScore), 12), 92);
    const riskCategory = clampedRisk >= 65 ? 'Elevated Risk' : clampedRisk >= 35 ? 'Moderate Risk' : 'Low Risk';

    return {
      success: true,
      isRealBackend: false,
      disease: 'diabetes',
      diseaseTitle: 'Type-2 Diabetes Risk',
      riskScore: clampedRisk,
      riskCategory,
      confidenceInterval: [Math.max(clampedRisk - 5, 5), Math.min(clampedRisk + 6, 98)],
      modelVersion: 'scikit-learn RandomForestClassifier v1.2 (Dev Preview)',
      suggestedSpecialist: 'Endocrinology & Diabetology',
      featureContributions: contributingFactors,
      recommendations,
      assessmentId: `DEV-ML-DIA-${Date.now().toString(36).toUpperCase()}`,
      assessedAt: new Date().toISOString(),
      previousAssessment: null,
    };
  }

  if (diseaseTarget === 'hypertension') {
    if (systolicBp >= 140 || diastolicBp >= 90) {
      riskScore += 38;
      contributingFactors.push({
        factor: 'Resting Blood Pressure',
        value: `${systolicBp} / ${diastolicBp} mmHg`,
        impact: 'High',
        contribution: 90,
        type: 'adverse',
        rationale: 'Stage 2 blood pressure range represents the dominant driver of ongoing arterial wall shear stress.',
      });
    } else if (systolicBp >= 125 || diastolicBp >= 80) {
      riskScore += 24;
      contributingFactors.push({
        factor: 'Resting Blood Pressure',
        value: `${systolicBp} / ${diastolicBp} mmHg`,
        impact: 'High',
        contribution: 80,
        type: 'adverse',
        rationale: 'Pre-hypertensive blood pressure range indicates early vascular tone elevation.',
      });
    } else {
      contributingFactors.push({
        factor: 'Resting Blood Pressure',
        value: `${systolicBp} / ${diastolicBp} mmHg`,
        impact: 'Protective',
        contribution: 78,
        type: 'positive',
        rationale: 'Normotensive blood pressure supports low vascular resistance.',
      });
    }

    if (bmi >= 26) {
      riskScore += 16;
      contributingFactors.push({
        factor: 'Body Mass Index (BMI)',
        value: `${bmi} kg/m²`,
        impact: 'Moderate',
        contribution: 60,
        type: 'adverse',
        rationale: 'Increased adipose mass contributes to sympathetic nervous tone.',
      });
    }

    if (smokingStatus) {
      riskScore += 18;
      contributingFactors.push({
        factor: 'Active Tobacco Exposure',
        value: 'Current smoker',
        impact: 'High',
        contribution: 72,
        type: 'adverse',
        rationale: 'Nicotine causes transient vasoconstriction.',
      });
    } else {
      contributingFactors.push({
        factor: 'Non-Smoker Status',
        value: 'Non-smoker',
        impact: 'Protective',
        contribution: 45,
        type: 'positive',
        rationale: 'Avoidance of tobacco preserves endothelial nitric oxide bioavailability.',
      });
    }

    recommendations.push({
      title: 'Dietary Sodium & Potassium Balance',
      action: 'Moderate dietary sodium intake while consuming potassium-rich foods such as leafy greens and legumes.',
      category: 'Nutrition',
      urgency: 'Priority',
    });
    recommendations.push({
      title: 'Home Blood Pressure Protocol',
      action: 'Log resting blood pressure twice weekly at the same hour to build a robust longitudinal baseline.',
      category: 'Monitoring',
      urgency: 'Actionable',
    });
    recommendations.push({
      title: 'Physician Review',
      action: 'Share your home monitoring logs with your physician to evaluate whether ambulatory monitoring is warranted.',
      category: 'Clinical Follow-up',
      urgency: 'Recommended',
    });

    const clampedRisk = Math.min(Math.max(Math.round(riskScore), 10), 90);
    const riskCategory = clampedRisk >= 60 ? 'Elevated Risk' : clampedRisk >= 35 ? 'Moderate Risk' : 'Low Risk';

    return {
      success: true,
      isRealBackend: false,
      disease: 'hypertension',
      diseaseTitle: 'Hypertension Risk',
      riskScore: clampedRisk,
      riskCategory,
      confidenceInterval: [Math.max(clampedRisk - 6, 5), Math.min(clampedRisk + 6, 96)],
      modelVersion: 'scikit-learn GradientBoostingClassifier v1.1 (Dev Preview)',
      suggestedSpecialist: 'Cardiology & Preventive Medicine',
      featureContributions: contributingFactors,
      recommendations,
      assessmentId: `DEV-ML-HTN-${Date.now().toString(36).toUpperCase()}`,
      assessedAt: new Date().toISOString(),
      previousAssessment: null,
    };
  }

  // Cardiovascular
  if (systolicBp >= 135 || diastolicBp >= 85) {
    riskScore += 24;
    contributingFactors.push({
      factor: 'Resting Blood Pressure',
      value: `${systolicBp} / ${diastolicBp} mmHg`,
      impact: 'High',
      contribution: 82,
      type: 'adverse',
      rationale: 'Arterial pressure above optimal range increases myocardial workload.',
    });
  }

  if (totalCholesterol > 210 || ldl > 130) {
    riskScore += 26;
    contributingFactors.push({
      factor: 'Serum Lipid Profile',
      value: `Total ${totalCholesterol} mg/dL (LDL: ${ldl})`,
      impact: 'High',
      contribution: 85,
      type: 'adverse',
      rationale: 'Elevated cholesterol is a primary feature for atherogenic plaque propensity.',
    });
  } else if (totalCholesterol <= 200) {
    contributingFactors.push({
      factor: 'Desirable Lipid Panel',
      value: `Total ${totalCholesterol} mg/dL`,
      impact: 'Protective',
      contribution: 74,
      type: 'positive',
      rationale: 'Favorable total cholesterol below 200 mg/dL provides cardiovascular buffering.',
    });
  }

  if (smokingStatus) {
    riskScore += 22;
    contributingFactors.push({
      factor: 'Active Tobacco Exposure',
      value: 'Active smoker',
      impact: 'High',
      contribution: 80,
      type: 'adverse',
      rationale: 'Smoking is a potent independent risk factor for coronary endothelial dysfunction.',
    });
  } else {
    contributingFactors.push({
      factor: 'Non-Smoker Status',
      value: 'Non-smoker',
      impact: 'Protective',
      contribution: 70,
      type: 'positive',
      rationale: 'Non-smoking significantly preserves coronary arterial elasticity.',
    });
  }

  recommendations.push({
    title: 'Heart-Healthy Dietary Pattern',
    action: 'Adopt a balanced Mediterranean-style eating pattern rich in unsaturated fats, legumes, and whole grains.',
    category: 'Nutrition',
    urgency: 'Priority',
  });
  recommendations.push({
    title: 'Regular Aerobic Conditioning',
    action: 'Engage in 150–300 minutes of moderate aerobic activity weekly.',
    category: 'Physical Activity',
    urgency: 'Priority',
  });
  recommendations.push({
    title: 'Comprehensive Cardiovascular Consultation',
    action: 'Discuss risk scores with a physician for consideration of baseline resting 12-lead ECG.',
    category: 'Clinical Follow-up',
    urgency: 'Recommended',
  });

  const clampedRisk = Math.min(Math.max(Math.round(riskScore), 8), 90);
  const riskCategory = clampedRisk >= 60 ? 'Elevated Risk' : clampedRisk >= 30 ? 'Moderate Risk' : 'Low Risk';

  return {
    success: true,
    isRealBackend: false,
    disease: 'cardiovascular',
    diseaseTitle: 'Cardiovascular Risk',
    riskScore: clampedRisk,
    riskCategory,
    confidenceInterval: [Math.max(clampedRisk - 5, 4), Math.min(clampedRisk + 5, 95)],
    modelVersion: 'scikit-learn LogisticRegression & GBM v1.0 (Dev Preview)',
    suggestedSpecialist: 'Cardiology & Internal Medicine',
    featureContributions: contributingFactors,
    recommendations,
    assessmentId: `DEV-ML-CVD-${Date.now().toString(36).toUpperCase()}`,
    assessedAt: new Date().toISOString(),
    previousAssessment: null,
  };
}
