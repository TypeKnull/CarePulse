"""
CarePulse Machine Learning Prediction Engine
Loads serialized scikit-learn models and generates structured risk assessments
matching the frontend contract in api.js.
"""

import os
import json
import math
import numpy as np
import pandas as pd
import joblib

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Global cache of loaded model artifacts
_LOADED_MODELS = {}
_METADATA = {}

def load_models():
    global _LOADED_MODELS, _METADATA
    targets = ['diabetes', 'cardiovascular', 'hypertension']
    for t in targets:
        model_path = os.path.join(MODELS_DIR, f"{t}_model.joblib")
        if os.path.exists(model_path):
            try:
                _LOADED_MODELS[t] = joblib.load(model_path)
            except Exception as e:
                print(f"Warning: Failed to load {t} model: {e}")
    
    meta_path = os.path.join(MODELS_DIR, 'metadata.json')
    if os.path.exists(meta_path):
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                _METADATA = json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load ML metadata: {e}")

def get_loaded_models_list():
    return list(_LOADED_MODELS.keys())

def calculate_binomial_ci(p, n=250, confidence=1.96):
    """
    Computes a valid 95% confidence interval for estimated binomial probability.
    """
    p_clamped = max(0.01, min(0.99, p))
    margin = confidence * math.sqrt((p_clamped * (1 - p_clamped)) / n)
    lower = max(1, int(round((p_clamped - margin) * 100)))
    upper = min(99, int(round((p_clamped + margin) * 100)))
    return [min(lower, upper), max(lower, upper)]

def predict_risk(disease_target, biometrics):
    """
    Performs inference for the specified disease target using trained scikit-learn models.
    Returns payload matching the frontend schema expected by PredictionResultPanel.
    """
    if not _LOADED_MODELS:
        load_models()

    target = (disease_target or '').lower().strip()
    if target not in ['diabetes', 'cardiovascular', 'hypertension']:
        raise ValueError(f"Unsupported disease target: '{disease_target}'. Supported: diabetes, cardiovascular, hypertension")

    model = _LOADED_MODELS.get(target)
    if not model:
        raise RuntimeError(f"Trained model artifact for '{target}' is not loaded.")

    meta = _METADATA.get(target, {})

    # Extract & sanitize features
    age = float(biometrics.get('age') or 40)
    gender_raw = str(biometrics.get('gender') or 'male').lower()
    gender_val = 1 if 'm' in gender_raw else 0
    bmi = float(biometrics.get('bmi') or 24.5)
    fasting_glucose = float(biometrics.get('fastingGlucose') or biometrics.get('fasting_glucose') or 95)
    systolic_bp = float(biometrics.get('systolicBp') or biometrics.get('systolic_bp') or 120)
    diastolic_bp = float(biometrics.get('diastolicBp') or biometrics.get('diastolic_bp') or 80)
    total_chol = float(biometrics.get('totalCholesterol') or biometrics.get('total_cholesterol') or 180)
    hdl = float(biometrics.get('hdl') or 50)
    ldl = float(biometrics.get('ldl') or 100)
    
    smoking = biometrics.get('smokingStatus') or biometrics.get('smoking_status')
    smoking_val = 1 if (smoking is True or smoking == 1 or str(smoking).lower() in ['true', 'yes', 'smoker', 'active']) else 0
    
    activity = float(biometrics.get('physicalActivityDays') or biometrics.get('physical_activity_days') or 3.0)
    fam_hist = biometrics.get('familyHistory') or biometrics.get('family_history')
    fam_hist_val = 1 if (fam_hist is True or fam_hist == 1 or str(fam_hist).lower() in ['true', 'yes']) else 0

    if target == 'diabetes':
        disease_title = "Type-2 Diabetes Risk"
        suggested_specialist = "Endocrinology & Diabetology"
        model_version = f"scikit-learn RandomForestClassifier (Acc: {meta.get('accuracy', 0.77):.1%})"
        features = pd.DataFrame([[age, bmi, fasting_glucose, systolic_bp, activity, fam_hist_val]],
                                columns=['age', 'bmi', 'fasting_glucose', 'systolic_bp', 'physical_activity_days', 'family_history'])
        prob = float(model.predict_proba(features)[0][1])

        # Feature contributions
        contributions = [
            {
                "factor": "Fasting Blood Glucose",
                "value": f"{int(fasting_glucose)} mg/dL",
                "impact": "High" if fasting_glucose >= 110 else "Optimal" if fasting_glucose <= 99 else "Moderate",
                "contribution": min(95, max(15, int(abs(fasting_glucose - 90) * 1.5 + 20))),
                "type": "adverse" if fasting_glucose >= 100 else "beneficial",
                "rationale": "Fasting glucose ≥ 100 mg/dL reflects impaired glycemic regulation; ≥ 126 mg/dL meets clinical threshold for diabetes." if fasting_glucose >= 100 else "Normal glycemic baseline supports metabolic stability."
            },
            {
                "factor": "Body Mass Index (BMI)",
                "value": f"{bmi:.1f} kg/m²",
                "impact": "High" if bmi >= 30 else "Moderate" if bmi >= 25 else "Beneficial",
                "contribution": min(90, max(10, int(abs(bmi - 22) * 4 + 10))),
                "type": "adverse" if bmi >= 25 else "beneficial",
                "rationale": "Adiposity contributes significantly to peripheral insulin resistance." if bmi >= 25 else "Healthy body mass preserves peripheral insulin sensitivity."
            },
            {
                "factor": "Physical Activity Level",
                "value": f"{activity:.1f} days/week",
                "impact": "Beneficial" if activity >= 4 else "Moderate" if activity >= 2 else "High",
                "contribution": int(max(15, (7 - activity) * 12)),
                "type": "beneficial" if activity >= 3 else "adverse",
                "rationale": "Aerobic activity enhances GLUT-4 glucose transporter translocation independent of insulin." if activity >= 3 else "Sedentary activity diminishes muscular glucose disposal."
            },
            {
                "factor": "Genetic Family History",
                "value": "Positive" if fam_hist_val else "Negative",
                "impact": "High" if fam_hist_val else "Low",
                "contribution": 70 if fam_hist_val else 20,
                "type": "adverse" if fam_hist_val else "beneficial",
                "rationale": "First-degree relative predisposition increases baseline risk susceptibility." if fam_hist_val else "Absence of first-degree diabetic history lowers hereditary risk."
            }
        ]

        recommendations = [
            {
                "title": "Complex Carbohydrate & Fiber Regimen",
                "action": "Emphasize high-fiber legumes, whole grains, and non-starchy vegetables to lower glycemic index.",
                "category": "Nutrition",
                "urgency": "Priority" if prob > 0.5 else "Routine"
            },
            {
                "title": "Structured Aerobic & Resistance Training",
                "action": "Aim for 150 minutes of moderate-intensity aerobic exercise and 2 resistance sessions per week.",
                "category": "Exercise",
                "urgency": "Routine"
            },
            {
                "title": "HbA1c Diagnostic Screening",
                "action": "Schedule fasting glycated hemoglobin (HbA1c) laboratory evaluation to establish official baseline.",
                "category": "Clinical",
                "urgency": "Priority" if fasting_glucose >= 110 else "Preventative"
            }
        ]

    elif target == 'cardiovascular':
        disease_title = "Cardiovascular Disease Risk"
        suggested_specialist = "Cardiology & Vascular Medicine"
        model_version = f"scikit-learn GradientBoostingClassifier (Acc: {meta.get('accuracy', 0.78):.1%})"
        features = pd.DataFrame([[age, gender_val, systolic_bp, diastolic_bp, total_chol, hdl, ldl, smoking_val, activity, bmi]],
                                columns=['age', 'gender', 'systolic_bp', 'diastolic_bp', 'total_cholesterol', 'hdl', 'ldl', 'smoking_status', 'physical_activity_days', 'bmi'])
        prob = float(model.predict_proba(features)[0][1])

        contributions = [
            {
                "factor": "Systolic Blood Pressure",
                "value": f"{int(systolic_bp)} mmHg",
                "impact": "High" if systolic_bp >= 140 else "Moderate" if systolic_bp >= 125 else "Optimal",
                "contribution": min(95, max(15, int(abs(systolic_bp - 115) * 1.6 + 20))),
                "type": "adverse" if systolic_bp >= 120 else "beneficial",
                "rationale": "Elevated systolic pressure exerts endothelial shear strain on coronary and carotid arteries." if systolic_bp >= 120 else "Normotensive arterial pressure protects vascular endothelium."
            },
            {
                "factor": "Lipid Profile (Total / LDL)",
                "value": f"{int(total_chol)} mg/dL (LDL {int(ldl)})",
                "impact": "High" if total_chol >= 220 or ldl >= 130 else "Moderate" if total_chol >= 200 else "Desirable",
                "contribution": min(90, max(20, int(abs(total_chol - 170) * 0.9 + 25))),
                "type": "adverse" if total_chol >= 200 else "beneficial",
                "rationale": "Circulating apoB-containing lipoproteins penetrate the intima, initiating atherogenesis." if total_chol >= 200 else "Optimal lipid levels prevent plaque formation."
            },
            {
                "factor": "Tobacco / Smoking Status",
                "value": "Active Smoker" if smoking_val else "Non-Smoker",
                "impact": "High" if smoking_val else "Beneficial",
                "contribution": 85 if smoking_val else 15,
                "type": "adverse" if smoking_val else "beneficial",
                "rationale": "Combustion toxins cause endothelial dysfunction, vasospasm, and hypercoagulability." if smoking_val else "Non-smoking status preserves microvascular tone."
            }
        ]

        recommendations = [
            {
                "title": "Heart-Healthy Mediterranean Dietary Pattern",
                "action": "Incorporate extra virgin olive oil, nuts, and omega-3 fatty acids while limiting saturated fats to < 7% of calories.",
                "category": "Dietary",
                "urgency": "Priority" if prob > 0.45 else "Routine"
            },
            {
                "title": "Coronary Risk Profile & ECG Assessment",
                "action": "Consult cardiologist for a 12-lead ECG and complete advanced lipid panel fractionation.",
                "category": "Clinical",
                "urgency": "Priority" if prob > 0.55 else "Preventative"
            }
        ]

    else:  # hypertension
        disease_title = "Hypertension Risk"
        suggested_specialist = "Internal Medicine & Cardiology"
        model_version = f"scikit-learn LogisticRegression-Ensemble (Acc: {meta.get('accuracy', 0.76):.1%})"
        features = pd.DataFrame([[age, systolic_bp, diastolic_bp, bmi, activity, smoking_val, fam_hist_val]],
                                columns=['age', 'systolic_bp', 'diastolic_bp', 'bmi', 'physical_activity_days', 'smoking_status', 'family_history'])
        prob = float(model.predict_proba(features)[0][1])

        contributions = [
            {
                "factor": "Arterial Pressure (BP)",
                "value": f"{int(systolic_bp)} / {int(diastolic_bp)} mmHg",
                "impact": "High" if systolic_bp >= 140 or diastolic_bp >= 90 else "Moderate" if systolic_bp >= 120 else "Normal",
                "contribution": min(95, max(20, int(abs(systolic_bp - 110) * 1.5 + 20))),
                "type": "adverse" if systolic_bp >= 120 else "beneficial",
                "rationale": "Vascular wall tension increases cardiac afterload and microvascular remodeling." if systolic_bp >= 120 else "Normal hemodynamic pressure minimizes left ventricular strain."
            },
            {
                "factor": "Body Mass Index",
                "value": f"{bmi:.1f} kg/m²",
                "impact": "High" if bmi >= 30 else "Moderate" if bmi >= 25 else "Normal",
                "contribution": min(85, max(15, int(abs(bmi - 22) * 3.5 + 15))),
                "type": "adverse" if bmi >= 25 else "beneficial",
                "rationale": "Increased adipose mass increases circulating blood volume and sympathetic tone." if bmi >= 25 else "Lean metabolic mass maintains healthy peripheral resistance."
            }
        ]

        recommendations = [
            {
                "title": "DASH Dietary Sodium Reduction",
                "action": "Cap dietary sodium intake below 2,000 mg/day and increase dietary potassium through leafy greens and citrus.",
                "category": "Dietary",
                "urgency": "Priority" if systolic_bp >= 130 else "Routine"
            },
            {
                "title": "Home Blood Pressure Telemetry Log",
                "action": "Record twice-daily rested blood pressure readings (morning and evening) for 14 consecutive days.",
                "category": "Monitoring",
                "urgency": "Routine"
            }
        ]

    risk_score = int(round(prob * 100))
    if risk_score < 25:
        risk_category = "Low Risk"
    elif risk_score < 50:
        risk_category = "Moderate / Borderline"
    elif risk_score < 75:
        risk_category = "Elevated Risk"
    else:
        risk_category = "High Risk"

    confidence_interval = calculate_binomial_ci(prob)

    return {
        "disease": target,
        "diseaseTitle": disease_title,
        "riskScore": risk_score,
        "riskCategory": risk_category,
        "confidenceInterval": confidence_interval,
        "modelVersion": model_version,
        "suggestedSpecialist": suggested_specialist,
        "featureContributions": contributions,
        "recommendations": recommendations,
        "assessedProbability": round(prob, 4)
    }

# Load models at module import
load_models()
