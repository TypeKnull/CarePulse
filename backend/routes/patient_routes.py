"""
CarePulse Patient & Clinical Dashboard Routes
GET  /api/patients/<userId>/dashboard
POST /api/patients/<userId>/onboarding
POST /api/patients/<userId>/vitals
"""

import uuid
import time
import math
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from db import execute_one, execute_query, execute_transaction, execute_write
from auth_utils import token_required
from health_index import calculate_health_index
from recommendation_service import build_measurement_recommendations, build_persistence_statements

patient_bp = Blueprint('patient_bp', __name__)


def serialize_timestamp(value):
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return str(value) if value is not None else None


def chart_points(rows, value_key, reference_date=None, max_age_days=None):
    points = []
    cutoff = reference_date - timedelta(days=max_age_days) if reference_date and max_age_days else None
    for row in reversed(rows):
        raw_date = row.get('report_date') or row.get('created_at') or row.get('recorded_at')
        try:
            stamp = raw_date if isinstance(raw_date, datetime) else datetime.combine(raw_date, datetime.min.time()) if isinstance(raw_date, date) else datetime.fromisoformat(str(raw_date).replace('Z', '+00:00'))
        except (TypeError, ValueError):
            continue
        if cutoff and stamp < cutoff:
            continue
        value = row.get(value_key)
        if value is None:
            continue
        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            continue
        points.append({
            'label': stamp.strftime('%b %d, %Y'),
            'value': numeric_value,
            'timestamp': serialize_timestamp(raw_date),
            'note': 'Recorded lab result' if 'test_name' in row else 'Recorded clinical vital',
        })
    return points

def verify_patient_ownership(target_user_id, current_user_id):
    """Allow access only through the authenticated user's own ID or patient record."""
    if target_user_id == current_user_id:
        return True
    patient_row = execute_one(
        "SELECT patient_id FROM patient WHERE patient_id = %s AND user_id = %s",
        (target_user_id, current_user_id)
    )
    return bool(patient_row)

@patient_bp.route('/patients/<userId>/dashboard', methods=['GET'])
@token_required
def get_dashboard(userId, current_user):
    if not verify_patient_ownership(userId, current_user['id']):
        return jsonify({'error': 'Forbidden. Cannot access another patient\'s dashboard.'}), 403

    try:
        # 1. Fetch user & patient record
        user_row = execute_one(
            """SELECT u.user_id, u.full_name, u.email,
                      p.patient_id, p.date_of_birth, p.gender, p.blood_group,
                      p.height_cm, p.weight_kg, p.smoking_status, p.physical_activity_level, p.updated_at,
                      p.emergency_contact_name, p.emergency_contact_phone,
                      hp.chronic_conditions, hp.allergies, hp.current_medications, hp.family_history
               FROM user u
               LEFT JOIN patient p ON u.user_id = p.user_id
               LEFT JOIN health_profile hp ON p.patient_id = hp.patient_id
               WHERE u.user_id = %s OR p.patient_id = %s""",
            (userId, userId)
        )

        if not user_row:
            return jsonify({'error': f"Patient '{userId}' not found."}), 404

        patient_id = user_row.get('patient_id') or userId
        full_name = user_row.get('full_name') or 'Patient'

        # 2. Fetch latest vitals
        vitals_rows = []
        if patient_id:
            vitals_rows = execute_query(
                """SELECT vital_id, recorded_at, systolic_bp, diastolic_bp, heart_rate, temperature, respiratory_rate
                   FROM vitals
                   WHERE patient_id = %s
                   ORDER BY recorded_at DESC LIMIT 10""",
                (patient_id,)
            )

        latest_vitals = vitals_rows[0] if vitals_rows else {}

        # 3. Fetch latest predictions
        pred_rows = []
        if patient_id:
            pred_rows = execute_query(
                """SELECT p.prediction_id, p.assessment_date, p.risk_score, p.risk_category, p.result_summary,
                          dm.disease_name, dm.algorithm, dm.model_version
                   FROM prediction p
                   JOIN disease_model dm ON p.model_id = dm.model_id
                   WHERE p.patient_id = %s
                   ORDER BY p.assessment_date DESC LIMIT 5""",
                (patient_id,)
            )

        # 4. Fetch recommendations
        rec_rows = []
        if patient_id:
            rec_rows = execute_query(
                """SELECT r.recommendation_id, r.title, r.description, r.priority, r.status,
                          r.source_type, r.source_id, r.source_label,
                          ra.action_id, ra.action_text, ra.target_metric, ra.expected_impact, ra.is_completed
                   FROM recommendation r
                   LEFT JOIN recommendation_action ra ON r.recommendation_id = ra.recommendation_id
                   WHERE r.patient_id = %s AND r.status = 'Active'
                   ORDER BY r.created_at DESC LIMIT 5""",
                (patient_id,)
            )

        # 5. Fetch upcoming appointments
        appt_rows = []
        if patient_id:
            appt_rows = execute_query(
                """SELECT a.appointment_id, a.appointment_date, a.appointment_type, a.location, a.status,
                          d.full_name as doctor_name, d.specialization
                   FROM appointment a
                   LEFT JOIN doctor d ON a.doctor_id = d.doctor_id
                   WHERE a.patient_id = %s AND a.appointment_date >= NOW()
                   ORDER BY a.appointment_date ASC LIMIT 1""",
                (patient_id,)
            )

        # Calculate BMI
        height = float(user_row['height_cm']) if user_row.get('height_cm') else None
        weight = float(user_row['weight_kg']) if user_row.get('weight_kg') else None
        bmi = round(weight / ((height / 100) ** 2), 1) if (height and weight and height > 0) else None

        # Fetch recorded lab and lifestyle history; dashboard data must not silently hide query failures.
        lab_rows = execute_query(
            """SELECT lr.lab_result_id, lr.lab_id, lr.test_name, lr.result_value, lr.unit,
                      lr.reference_range, lr.is_abnormal, lr.created_at, r.report_date
               FROM lab_result lr LEFT JOIN lab_report r ON lr.lab_id = r.lab_id
               WHERE lr.patient_id = %s
               ORDER BY COALESCE(r.report_date, DATE(lr.created_at)) DESC, lr.created_at DESC LIMIT 50""",
            (patient_id,)
        ) if patient_id else []
        lifestyle_rows = execute_query(
            """SELECT log_id, recorded_at, physical_activity_days, smoking_status
               FROM lifestyle_log WHERE patient_id = %s
               ORDER BY recorded_at DESC LIMIT 30""",
            (patient_id,)
        ) if patient_id else []
        symptom_rows = execute_query(
            """SELECT check_id, check_date, symptom_summary, severity, recommendation
               FROM symptom_check WHERE patient_id = %s
               ORDER BY check_date DESC LIMIT 10""",
            (patient_id,)
        ) if patient_id else []

        factor_map = {}
        try:
            if pred_rows:
                pred_ids = [p['prediction_id'] for p in pred_rows if p.get('prediction_id')]
                if pred_ids:
                    format_strings = ','.join(['%s'] * len(pred_ids))
                    factors = execute_query(
                        f"""SELECT prediction_id, factor_name, impact_score, impact
                            FROM prediction_factor
                            WHERE prediction_id IN ({format_strings})""",
                        tuple(pred_ids)
                    )
                    for f in factors:
                        factor_map.setdefault(f['prediction_id'], []).append(f)
        except (StopIteration, Exception):
            factor_map = {}

        # Extract glucose and cholesterol values from lab results if present
        glucose_val = None
        chol_val = None
        glucose_row = None
        chol_row = None
        for lr in lab_rows:
            tname = str(lr.get('test_name') or '').lower()
            if 'glucose' in tname and glucose_val is None:
                try:
                    parsed = float(lr.get('result_value'))
                    if math.isfinite(parsed):
                        glucose_val, glucose_row = parsed, lr
                except (ValueError, TypeError):
                    pass
            elif 'cholesterol' in tname and chol_val is None:
                try:
                    parsed = float(lr.get('result_value'))
                    if math.isfinite(parsed):
                        chol_val, chol_row = parsed, lr
                except (ValueError, TypeError):
                    pass

        has_bp = latest_vitals.get('systolic_bp') is not None or latest_vitals.get('diastolic_bp') is not None
        sys_bp = latest_vitals.get('systolic_bp')
        dia_bp = latest_vitals.get('diastolic_bp')

        has_glucose = glucose_val is not None
        has_chol = chol_val is not None
        has_hr = latest_vitals.get('heart_rate') is not None
        hr_val = latest_vitals.get('heart_rate')

        # Parse physical activity
        act_raw = user_row.get('physical_activity_level')
        act_val = None
        if act_raw is not None:
            try:
                act_val = float(str(act_raw).split()[0])
            except (ValueError, TypeError, IndexError):
                act_val = None
        if lifestyle_rows and lifestyle_rows[0].get('physical_activity_days') is not None:
            act_val = float(lifestyle_rows[0]['physical_activity_days'])
        has_activity = act_val is not None

        # Calculate age from date_of_birth
        dob = user_row.get('date_of_birth')
        calculated_age = None
        if dob:
            try:
                today = date.today()
                if isinstance(dob, str):
                    dob_d = datetime.strptime(dob[:10], '%Y-%m-%d').date()
                elif isinstance(dob, datetime):
                    dob_d = dob.date()
                else:
                    dob_d = dob
                calculated_age = today.year - dob_d.year - ((today.month, today.day) < (dob_d.month, dob_d.day))
            except Exception:
                calculated_age = None

        fasting_glucose_val = glucose_val if glucose_row and 'fast' in str(glucose_row.get('test_name') or '').lower() else None
        health_index = calculate_health_index(
            sys_bp, dia_bp, fasting_glucose_val, bmi, chol_val, calculated_age
        )

        # Construct the dashboard matrix from recorded or explicitly calculated values only.
        bp_complete = sys_bp is not None and dia_bp is not None
        if not has_bp:
            bp_value = 'Not recorded'
        elif bp_complete:
            bp_value = f'{sys_bp} / {dia_bp}'
        else:
            bp_value = f"{sys_bp if sys_bp is not None else 'Not recorded'} / {dia_bp if dia_bp is not None else 'Not recorded'}"
        if not bp_complete:
            bp_status, bp_label = 'unrecorded', 'Incomplete blood pressure reading'
        elif calculated_age is None or calculated_age < 18:
            bp_status, bp_label = 'recorded', 'Adult blood-pressure reference requires age 18 or older'
        elif sys_bp >= 180 or dia_bp >= 120:
            bp_status, bp_label = 'elevated', 'Very high reading; seek prompt clinical assessment'
        elif sys_bp >= 140 or dia_bp >= 90:
            bp_status, bp_label = 'elevated', 'Stage 2 range; one reading is not a diagnosis'
        elif sys_bp >= 130 or dia_bp >= 80:
            bp_status, bp_label = 'borderline', 'Stage 1 range; one reading is not a diagnosis'
        elif sys_bp >= 120 and dia_bp < 80:
            bp_status, bp_label = 'borderline', 'Elevated range'
        else:
            bp_status, bp_label = 'optimal', 'Below elevated range'

        glucose_is_fasting = fasting_glucose_val is not None
        if has_glucose and not glucose_is_fasting:
            glucose_status = 'recorded'
            glucose_label = 'Result saved; fasting reference ranges require a fasting sample'
        elif has_glucose and glucose_val < 54:
            glucose_status = 'urgent'
            glucose_label = 'Very low result; seek prompt clinical assessment. Emergency care for severe symptoms.'
        elif has_glucose and glucose_val < 70:
            glucose_status, glucose_label = 'elevated', 'Low result; seek clinical guidance'
        elif has_glucose and glucose_val >= 126:
            glucose_status, glucose_label = 'elevated', 'High fasting result; one test is not a diagnosis'
        elif has_glucose and glucose_val >= 100:
            glucose_status, glucose_label = 'borderline', 'Above common fasting range; interpretation needs context'
        elif has_glucose:
            glucose_status, glucose_label = 'optimal', 'Within common fasting reference range'
        else:
            glucose_status, glucose_label = 'unrecorded', 'No fasting lab result recorded'

        biometrics = [
            {
                "id": "blood-pressure",
                "name": "Blood Pressure",
                "value": bp_value,
                "systolic": sys_bp,
                "diastolic": dia_bp,
                "unit": "mmHg",
                "status": bp_status,
                "statusLabel": bp_label,
                "trend": "stable",
                "trendText": f"Clinical vital recorded {latest_vitals.get('recorded_at')}" if has_bp else "No clinical vital recorded",
                "source": "Clinical vital record",
                "recordedAt": latest_vitals.get('recorded_at').isoformat() if hasattr(latest_vitals.get('recorded_at'), 'isoformat') else latest_vitals.get('recorded_at'),
                "normalRange": "Normal: <120 systolic and <80 diastolic mmHg",
                "sparkline": [v['systolic_bp'] for v in reversed(vitals_rows) if v.get('systolic_bp') is not None],
                "category": "cardio"
            },
            {
                "id": "fasting-glucose",
                "name": "Blood Glucose",
                "value": f"{int(glucose_val) if glucose_val == int(glucose_val) else glucose_val}" if has_glucose else "Not recorded",
                "unit": "mg/dL",
                "status": glucose_status,
                "statusLabel": glucose_label,
                "trend": "stable",
                "trendText": f"Lab result recorded {glucose_row.get('report_date') or glucose_row.get('created_at')}" if glucose_row else "No fasting lab result recorded",
                "source": "Lab result" if glucose_row else None,
                "recordedAt": glucose_row.get('report_date') or glucose_row.get('created_at') if glucose_row else None,
                "normalRange": "70 - 99 mg/dL (fasting sample)",
                "sparkline": [glucose_val] if has_glucose else [],
                "category": "metabolic"
            },
            {
                "id": "bmi",
                "name": "Body Mass Index (BMI)",
                "value": f"{bmi}" if bmi else "Not recorded",
                "unit": "kg/m²",
                "status": "unrecorded" if bmi is None else "recorded" if calculated_age is None or calculated_age < 20 else "borderline" if bmi < 18.5 or bmi >= 25 else "optimal",
                "statusLabel": "Height and weight not recorded" if bmi is None else "Adult BMI reference requires age 20 or older" if calculated_age is None or calculated_age < 20 else "Below common adult BMI range" if bmi < 18.5 else "Above common adult BMI range" if bmi >= 25 else "Within common adult BMI range",
                "trend": "stable",
                "trendText": f"Calculated from saved profile updated {user_row.get('updated_at')}" if bmi is not None else "Awaiting height and weight",
                "source": "Calculated from saved profile",
                "recordedAt": user_row.get('updated_at').isoformat() if hasattr(user_row.get('updated_at'), 'isoformat') else user_row.get('updated_at'),
                "normalRange": "18.5 - 24.9 (adult reference)" if calculated_age is not None and calculated_age >= 20 else "Age-specific reference required",
                "sparkline": [bmi] if bmi else [],
                "category": "biometric"
            },
            {
                "id": "total-cholesterol",
                "name": "Total Cholesterol",
                "value": f"{int(chol_val) if chol_val == int(chol_val) else chol_val}" if has_chol else "Not recorded",
                "unit": "mg/dL",
                "status": "unrecorded" if not has_chol else "recorded" if calculated_age is None or calculated_age < 20 else "borderline" if chol_val >= 200 else "optimal",
                "statusLabel": "No cholesterol lab result recorded" if not has_chol else "Adult cholesterol reference requires age 20 or older" if calculated_age is None or calculated_age < 20 else "200 mg/dL or above; interpret with full lipid profile" if chol_val >= 200 else "Below 200 mg/dL; interpret with full lipid profile",
                "trend": "stable",
                "trendText": f"Lab result recorded {chol_row.get('report_date') or chol_row.get('created_at')}" if chol_row else "No cholesterol lab result recorded",
                "source": "Lab result" if chol_row else None,
                "recordedAt": chol_row.get('report_date') or chol_row.get('created_at') if chol_row else None,
                "normalRange": "< 200 mg/dL (adult reference)" if calculated_age is not None and calculated_age >= 20 else "Age-specific reference required",
                "sparkline": [chol_val] if has_chol else [],
                "category": "lipid"
            },
            {
                "id": "heart-rate",
                "name": "Resting Heart Rate",
                "value": f"{hr_val}" if has_hr else "Not recorded",
                "unit": "BPM",
                "status": "unrecorded" if not has_hr else "optimal" if 60 <= hr_val <= 100 else "borderline",
                "statusLabel": "No heart-rate measurement recorded" if not has_hr else "Within common adult resting range" if 60 <= hr_val <= 100 else "Outside common adult resting range; context matters",
                "trend": "stable",
                "trendText": f"Clinical vital recorded {latest_vitals.get('recorded_at')}" if has_hr else "No heart-rate measurement recorded",
                "source": "Clinical vital record" if has_hr else None,
                "recordedAt": latest_vitals.get('recorded_at').isoformat() if hasattr(latest_vitals.get('recorded_at'), 'isoformat') else latest_vitals.get('recorded_at'),
                "normalRange": "60 - 100 BPM",
                "sparkline": [v['heart_rate'] for v in reversed(vitals_rows) if v.get('heart_rate')] or ([hr_val] if has_hr else []),
                "category": "cardio"
            },
            {
                "id": "physical-activity",
                "name": "Physical Activity",
                "value": f"{act_val}" if has_activity else "Not recorded",
                "unit": "days / week",
                "status": "unrecorded" if not has_activity else "recorded",
                "statusLabel": "No activity log recorded" if not has_activity else "Activity recorded; not a clinical classification",
                "trend": "stable",
                "trendText": f"Lifestyle entry recorded {lifestyle_rows[0].get('recorded_at')}" if lifestyle_rows else "Saved profile baseline" if has_activity else "No activity log recorded",
                "source": "Lifestyle log" if lifestyle_rows else "Saved profile baseline" if has_activity else None,
                "recordedAt": lifestyle_rows[0].get('recorded_at').isoformat() if lifestyle_rows and hasattr(lifestyle_rows[0].get('recorded_at'), 'isoformat') else lifestyle_rows[0].get('recorded_at') if lifestyle_rows else None,
                "normalRange": "≥ 5 days / 150 min",
                "sparkline": [act_val] if has_activity else [],
                "category": "lifestyle"
            }
        ]

        # Construct risk assessments & risk intelligence
        specialist_map = {
            'diabetes': 'Endocrinology & Diabetology',
            'cardiovascular': 'Cardiology & Vascular Medicine',
            'hypertension': 'Internal Medicine & Cardiology'
        }
        disease_title_map = {
            'diabetes': 'Type-2 Diabetes Risk',
            'cardiovascular': 'Cardiovascular Disease Risk',
            'hypertension': 'Hypertension Risk'
        }

        risk_assessments = []
        for p in pred_rows:
            d_name = p['disease_name']
            r_score = int(p['risk_score'])
            p_id = p['prediction_id']
            factors = factor_map.get(p_id, [])

            drivers = []
            contributing_factors = []
            for f in factors:
                impact_name = f.get('impact', 'Moderate')
                is_pos = str(impact_name).lower() in ['protective', 'beneficial', 'optimal', 'positive']
                score = int(f.get('impact_score', 50))
                drivers.append({
                    "factor": f.get('factor_name', 'Biometric Indicator'),
                    "impact": impact_name,
                    "contribution": score,
                    "type": "positive" if is_pos else "adverse"
                })
                contributing_factors.append({
                    "factor": f.get('factor_name', 'Biometric Indicator'),
                    "weight": score,
                    "type": "positive" if is_pos else "adverse"
                })

            item = {
                "id": d_name,
                "assessmentId": p_id,
                "title": disease_title_map.get(d_name, f"{d_name.capitalize()} Risk"),
                "disease": disease_title_map.get(d_name, f"{d_name.capitalize()} Risk"),
                "diseaseTitle": disease_title_map.get(d_name, f"{d_name.capitalize()} Risk"),
                "category": "Metabolic Health" if d_name == 'diabetes' else "Cardiovascular Health",
                "riskPercentage": r_score,
                "riskScore": r_score,
                "riskTier": p['risk_category'],
                "confidenceInterval": [max(5, r_score - 5), min(95, r_score + 5)],
                "primaryDriver": drivers[0]['factor'] if drivers else "Biometric parameters",
                "badgeColor": "cyan" if d_name == 'diabetes' else ("blue" if d_name == 'hypertension' else "teal"),
                "lastAssessed": p['assessment_date'].isoformat()[:10] if hasattr(p['assessment_date'], 'isoformat') else str(p['assessment_date'])[:10],
                "assessedAt": p['assessment_date'].isoformat() if hasattr(p['assessment_date'], 'isoformat') else str(p['assessment_date']),
                "trend": "stable",
                "modelEngine": f"{p['algorithm']} ({p['model_version']})",
                "modelVersion": f"{p['algorithm']} ({p['model_version']})",
                "summary": p.get('result_summary') or f"Risk estimate calculated at {r_score}% ({p['risk_category']}).",
                "specialist": specialist_map.get(d_name, "Internal Medicine"),
                "drivers": drivers,
                "contributingFactors": contributing_factors,
                "recommendationsCount": len(rec_rows)
            }
            risk_assessments.append(item)

        # Construct recommendations list
        recs_list = []
        for r in rec_rows:
            recs_list.append({
                "id": r['recommendation_id'],
                "title": r['title'],
                "category": r.get('target_metric') or 'Care suggestion',
                "urgency": r.get('priority', 'Routine'),
                "action": r.get('action_text') or r.get('description'),
                "impactMetric": r.get('target_metric') or "Overall Vitality",
                "actionId": r.get('action_id'),
                "isCompleted": bool(r.get('is_completed')),
                "source": r.get('source_label') or 'Previously recorded recommendation',
                "status": 'Completed' if r.get('is_completed') else r.get('status', 'Active'),
            })

        upcoming_care = {
            "appointment": {
                "id": appt_rows[0]['appointment_id'],
                "doctor": appt_rows[0]['doctor_name'],
                "specialty": appt_rows[0]['specialization'],
                "date": appt_rows[0]['appointment_date'].isoformat() if hasattr(appt_rows[0]['appointment_date'], 'isoformat') else str(appt_rows[0]['appointment_date']),
                "type": appt_rows[0]['appointment_type'],
                "location": appt_rows[0]['location']
            } if appt_rows else None,
            "suggestedFollowUps": []
        }

        # Trend points are timestamped stored records; no synthetic Today values.
        current_date = datetime.now()
        bp_points = []
        for row in reversed(vitals_rows):
            if row.get('systolic_bp') is None or row.get('diastolic_bp') is None:
                continue
            recorded_at = row.get('recorded_at')
            if not recorded_at:
                continue
            bp_points.append({
                'label': recorded_at.strftime('%b %d, %Y') if hasattr(recorded_at, 'strftime') else str(recorded_at)[:10],
                'timestamp': serialize_timestamp(recorded_at),
                'systolic': row['systolic_bp'],
                'diastolic': row['diastolic_bp'],
                'note': 'Recorded clinical vital',
            })
        glucose_points = [row for row in lab_rows if 'glucose' in str(row.get('test_name') or '').lower()]
        glucose_points = chart_points(glucose_points, 'result_value', current_date, 365)
        chol_points = [row for row in lab_rows if 'cholesterol' in str(row.get('test_name') or '').lower()]
        chol_points = chart_points(chol_points, 'result_value', current_date, 365)
        bmi_points = []
        profile_timestamp = user_row.get('updated_at')
        if bmi is not None and profile_timestamp:
            bmi_points = [{
                'label': profile_timestamp.strftime('%b %d, %Y') if hasattr(profile_timestamp, 'strftime') else str(profile_timestamp)[:10],
                'value': bmi,
                'timestamp': serialize_timestamp(profile_timestamp),
                'note': 'Calculated from saved height and weight',
            }]
        six_months_ago = current_date - timedelta(days=183)
        bp_points_6m = [point for point in bp_points if point.get('timestamp') and str(point['timestamp'])[:10] >= six_months_ago.strftime('%Y-%m-%d')]
        glucose_points_6m = [point for point in glucose_points if point.get('timestamp') and str(point['timestamp'])[:10] >= six_months_ago.strftime('%Y-%m-%d')]
        chol_points_6m = [point for point in chol_points if point.get('timestamp') and str(point['timestamp'])[:10] >= six_months_ago.strftime('%Y-%m-%d')]

        bp_trend = {
            "name": "Systolic Blood Pressure",
            "metric": "Blood Pressure (Systolic / Diastolic)",
            "unit": "mmHg",
            "currentValue": bp_value,
            "changeText": "Baseline recorded from clinical log" if has_bp else "No measurements logged yet",
            "normalRange": { "min": 90, "max": 120, "label": "Normal: <120 / <80 mmHg" },
            "timeRanges": {
                "6M": bp_points_6m,
                "1Y": bp_points
            }
        }

        glucose_trend = {
            "name": "Fasting Blood Glucose",
            "metric": "Blood Glucose (Fasting)",
            "unit": "mg/dL",
            "currentValue": glucose_val if has_glucose else None,
            "changeText": "Recorded from laboratory screening" if has_glucose else "No measurements logged yet",
            "normalRange": { "min": 70, "max": 99, "label": "Normal: 70-99 mg/dL" },
            "timeRanges": {
                "6M": glucose_points_6m,
                "1Y": glucose_points
            }
        }

        bmi_trend = {
            "name": "Body Mass Index",
            "metric": "Body Mass Index (BMI)",
            "unit": "kg/m²",
            "currentValue": bmi if bmi else None,
            "changeText": "Calculated from height and weight" if bmi else "Pending height & weight",
            "normalRange": { "min": 18.5, "max": 24.9, "label": "Normal: 18.5 - 24.9 kg/m²" },
            "timeRanges": {
                "6M": bmi_points,
                "1Y": bmi_points
            }
        }

        chol_trend = {
            "name": "Total Cholesterol",
            "metric": "Total Serum Cholesterol",
            "unit": "mg/dL",
            "currentValue": chol_val if has_chol else None,
            "changeText": "Recorded from lipid panel" if has_chol else "No measurements logged yet",
            "normalRange": { "min": 125, "max": 200, "label": "Desirable: <200 mg/dL" },
            "timeRanges": {
                "6M": chol_points_6m,
                "1Y": chol_points
            }
        }

        trend_data = {
            "blood-pressure": bp_trend,
            "bloodPressure": bp_trend,
            "fasting-glucose": glucose_trend,
            "glucose": glucose_trend,
            "bmi": bmi_trend,
            "total-cholesterol": chol_trend,
            "cholesterol": chol_trend
        }

        # Construct Recent Activities Timeline
        recent_activities = []
        for p in pred_rows[:3]:
            timestamp = p.get('assessment_date')
            recent_activities.append({
                "id": f"act-pred-{p['prediction_id']}",
                "date": serialize_timestamp(timestamp),
                "timestampText": serialize_timestamp(timestamp),
                "title": f"{p['disease_name'].capitalize()} Risk Assessment",
                "category": "ML Assessment",
                "status": "Completed",
                "badgeColor": "cyan" if p['disease_name'] == 'diabetes' else "teal",
                "summary": p.get('result_summary') or f"Risk estimate calculated at {int(p['risk_score'])}% ({p['risk_category']}).",
                "clinicalNote": "Saved model assessment; informational, not a diagnosis."
            })

        for v in vitals_rows[:2]:
            timestamp = v.get('recorded_at')
            recent_activities.append({
                "id": f"act-vit-{v['vital_id']}",
                "date": serialize_timestamp(timestamp),
                "timestampText": serialize_timestamp(timestamp),
                "title": "Physiological Vitals Recorded",
                "category": "Telemetry",
                "status": "Completed",
                "badgeColor": "blue",
                "summary": f"Resting BP {v.get('systolic_bp', '-')}/{v.get('diastolic_bp', '-')} mmHg, Pulse {v.get('heart_rate', '-')} BPM.",
                "clinicalNote": "Recorded measurement; interpretation depends on context."
            })

        for lab in lab_rows[:10]:
            timestamp = lab.get('report_date') or lab.get('created_at')
            recent_activities.append({
                'id': f"act-lab-{lab['lab_result_id']}",
                'date': serialize_timestamp(timestamp),
                'timestampText': serialize_timestamp(timestamp),
                'title': lab['test_name'],
                'category': 'Lab Record',
                'status': 'Flagged by report' if lab.get('is_abnormal') else 'Recorded',
                'badgeColor': 'teal',
                'summary': f"{lab['result_value']} {lab.get('unit') or ''}".strip(),
                'clinicalNote': f"Reference: {lab.get('reference_range') or 'Not provided'}; interpretation depends on the report and clinical context.",
            })

        for symptom in symptom_rows[:5]:
            timestamp = symptom.get('check_date')
            recent_activities.append({
                'id': f"act-symptom-{symptom['check_id']}",
                'date': serialize_timestamp(timestamp),
                'timestampText': serialize_timestamp(timestamp),
                'title': 'Symptom assessment',
                'category': 'Symptom Check',
                'status': symptom.get('severity') or 'Recorded',
                'badgeColor': 'blue',
                'summary': symptom.get('symptom_summary') or 'Symptom report recorded.',
                'clinicalNote': symptom.get('recommendation'),
            })

        for lifestyle in lifestyle_rows[:5]:
            timestamp = lifestyle.get('recorded_at')
            details = []
            if lifestyle.get('physical_activity_days') is not None:
                details.append(f"Activity: {lifestyle['physical_activity_days']} days/week")
            if lifestyle.get('smoking_status'):
                details.append(f"Smoking status: {lifestyle['smoking_status']}")
            recent_activities.append({
                'id': f"act-life-{lifestyle['log_id']}",
                'date': serialize_timestamp(timestamp),
                'timestampText': serialize_timestamp(timestamp),
                'title': 'Lifestyle entry recorded',
                'category': 'Lifestyle',
                'status': 'Recorded',
                'badgeColor': 'blue',
                'summary': '; '.join(details),
                'clinicalNote': 'Patient-reported information.',
            })

        def activity_sort_key(item):
            try:
                return datetime.fromisoformat(str(item.get('date')).replace('Z', '+00:00')).timestamp()
            except (TypeError, ValueError, OverflowError):
                return 0
        recent_activities.sort(key=activity_sort_key, reverse=True)

        payload = {
            "patient": {
                "id": patient_id,
                "userId": user_row['user_id'],
                "name": full_name,
                "email": user_row['email'],
                "age": calculated_age,
                "dateOfBirth": dob.isoformat() if hasattr(dob, 'isoformat') else dob,
                "gender": user_row.get('gender'),
                "bloodGroup": user_row.get('blood_group'),
                "heightCm": float(user_row['height_cm']) if user_row.get('height_cm') is not None else None,
                "weightKg": float(user_row['weight_kg']) if user_row.get('weight_kg') is not None else None,
                "smokingStatus": True if user_row.get('smoking_status') == 'Smoker' else False if user_row.get('smoking_status') else None,
                "physicalActivityDays": act_val,
                "knownConditions": user_row.get('chronic_conditions'),
                "allergies": user_row.get('allergies'),
                "currentMedications": user_row.get('current_medications'),
                "familyHistory": user_row.get('family_history'),
                "healthIndex": health_index['score'],
                "healthStatus": "Experimental wellness indicator; non-diagnostic." if health_index['score'] is not None else "Not enough recorded measures to calculate an indicator.",
                "healthIndexDetails": health_index,
                "lastAssessment": pred_rows[0]['assessment_date'].isoformat() if pred_rows and hasattr(pred_rows[0]['assessment_date'], 'isoformat') else "Pending evaluation",
                "activeCarePlan": recs_list[0]['title'] if recs_list else "No active care plan recorded",
                "emergencyContact": {
                    "name": user_row.get('emergency_contact_name') or "None on file",
                    "phone": user_row.get('emergency_contact_phone') or "Not recorded"
                }
            },
            "biometrics": biometrics,
            "riskAssessments": risk_assessments,
            "riskIntelligence": risk_assessments,
            "trends": trend_data,
            "trendData": trend_data,
            "recentActivities": recent_activities,
            "labResults": [{
                'id': row['lab_result_id'],
                'name': row['test_name'],
                'value': row['result_value'],
                'unit': row.get('unit'),
                'referenceRange': row.get('reference_range'),
                'isAbnormal': bool(row.get('is_abnormal')),
                'reportDate': serialize_timestamp(row.get('report_date') or row.get('created_at')),
            } for row in lab_rows],
            "lifestyleHistory": [{
                'id': row['log_id'],
                'recordedAt': serialize_timestamp(row.get('recorded_at')),
                'physicalActivityDays': float(row['physical_activity_days']) if row.get('physical_activity_days') is not None else None,
                'smokingStatus': row.get('smoking_status'),
            } for row in lifestyle_rows],
            "recommendations": recs_list,
            "upcomingCare": upcoming_care,
            "isRealBackend": True
        }

        return jsonify(payload), 200

    except Exception:
        return jsonify({'error': 'Failed to load patient dashboard.'}), 500


@patient_bp.route('/patients/<userId>/onboarding', methods=['POST'])
@token_required
def save_onboarding(userId, current_user):
    if userId != current_user['id']:
        return jsonify({'error': 'Forbidden. Cannot update another patient\'s record.'}), 403
    data = request.get_json() or {}

    try:
        # Find user and patient
        user_row = execute_one(
            """SELECT u.user_id, u.full_name, u.email, p.patient_id, p.date_of_birth, p.gender,
                      p.blood_group, p.height_cm, p.weight_kg, p.smoking_status,
                      p.physical_activity_level, p.emergency_contact_name, p.emergency_contact_phone,
                      hp.chronic_conditions, hp.allergies, hp.current_medications, hp.family_history
               FROM user u LEFT JOIN patient p ON u.user_id = p.user_id
               LEFT JOIN health_profile hp ON p.patient_id = hp.patient_id
               WHERE u.user_id = %s""",
            (userId,)
        )
        if not user_row:
            return jsonify({'error': f"User '{userId}' not found."}), 404

        patient_id = user_row.get('patient_id')
        statements = []
        if not patient_id:
            patient_id = f"PAT-{int(time.time())}-{uuid.uuid4().hex[:6]}"
            statements.append((
                "INSERT INTO patient (patient_id, user_id) VALUES (%s, %s)",
                (patient_id, userId)
            ))

        date_of_birth = data.get('dateOfBirth')
        if date_of_birth:
            try:
                if not isinstance(date_of_birth, str) or len(date_of_birth) != 10:
                    raise ValueError
                parsed_date = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
                if parsed_date > date.today():
                    return jsonify({'error': 'Date of birth cannot be in the future.'}), 400
                date_of_birth = parsed_date
            except (TypeError, ValueError):
                return jsonify({'error': 'Date of birth must use YYYY-MM-DD format.'}), 400
        elif 'age' in data:
            return jsonify({'error': 'Submit dateOfBirth; age is derived from the date of birth.'}), 400

        gender = data.get('gender') or None
        blood_group = data.get('bloodGroup') or None
        height_cm = data.get('heightCm')
        weight_kg = data.get('weightKg')
        smoking_status = data.get('smokingStatus')
        smoking = None if smoking_status is None else ('Smoker' if smoking_status else 'Non-smoker')
        activity_value = data.get('physicalActivityDays')
        activity = str(activity_value) if activity_value is not None else None
        em_contact = data.get('emergencyContact') or {}
        em_name = em_contact.get('name') if isinstance(em_contact, dict) else None
        em_phone = em_contact.get('phone') if isinstance(em_contact, dict) else None

        if gender is not None and gender not in {'Male', 'Female', 'Other'}:
            return jsonify({'error': 'Gender must be Male, Female, or Other.'}), 400
        if blood_group is not None and blood_group not in {'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'}:
            return jsonify({'error': 'Blood group is not supported.'}), 400
        if smoking_status is not None and not isinstance(smoking_status, bool):
            return jsonify({'error': 'Smoking status must be true or false.'}), 400
        for field, value, lower, upper in (
            ('heightCm', height_cm, 50, 260), ('weightKg', weight_kg, 20, 300),
            ('physicalActivityDays', activity_value, 0, 7),
        ):
            if value is not None:
                try:
                    if isinstance(value, bool) or not lower <= float(value) <= upper:
                        raise ValueError
                except (TypeError, ValueError):
                    return jsonify({'error': f'{field} must be between {lower} and {upper}.'}), 400

        statements.append((
            """UPDATE patient
               SET gender = COALESCE(%s, gender), blood_group = COALESCE(%s, blood_group),
                   height_cm = COALESCE(%s, height_cm), weight_kg = COALESCE(%s, weight_kg),
                   smoking_status = COALESCE(%s, smoking_status),
                   physical_activity_level = COALESCE(%s, physical_activity_level),
                   emergency_contact_name = COALESCE(%s, emergency_contact_name),
                   emergency_contact_phone = COALESCE(%s, emergency_contact_phone),
                   date_of_birth = COALESCE(%s, date_of_birth)
               WHERE patient_id = %s""",
            (gender, blood_group, height_cm, weight_kg, smoking, activity, em_name, em_phone, date_of_birth, patient_id)
        ))

        # Insert vitals if provided
        sys_bp = data.get('systolicBp')
        dia_bp = data.get('diastolicBp')
        hr = data.get('heartRate') or data.get('restingHr')
        if sys_bp is not None or dia_bp is not None or hr is not None:
            vital_id = f"VIT-{int(time.time())}-{uuid.uuid4().hex[:6]}"
            statements.append((
                """INSERT INTO vitals (vital_id, patient_id, systolic_bp, diastolic_bp, heart_rate)
                   VALUES (%s, %s, %s, %s, %s)""",
                (vital_id, patient_id, sys_bp, dia_bp, hr)
            ))

        # Insert baseline lab report & results if glucose / cholesterol are provided
        fasting_glucose = data.get('fastingGlucose')
        total_chol = data.get('totalCholesterol')
        hdl = data.get('hdl')
        ldl = data.get('ldl')

        if any(v is not None for v in [fasting_glucose, total_chol, hdl, ldl]):
            lab_id = f"LAB-{int(time.time())}-{uuid.uuid4().hex[:6]}"
            statements.append((
                    """INSERT INTO lab_report (lab_id, patient_id, report_date, lab_name, report_type)
                       VALUES (%s, %s, CURDATE(), 'Baseline Health Intake', 'Metabolic & Lipid Screen')""",
                    (lab_id, patient_id)
            ))

            if fasting_glucose is not None:
                lr_id = f"LR-{uuid.uuid4().hex[:8]}"
                is_abn = float(fasting_glucose) >= 100
                statements.append((
                        """INSERT INTO lab_result (lab_result_id, lab_id, patient_id, test_name, result_value, unit, reference_range, is_abnormal)
                           VALUES (%s, %s, %s, 'Fasting Blood Glucose', %s, 'mg/dL', '70 - 99', %s)""",
                        (lr_id, lab_id, patient_id, str(fasting_glucose), is_abn)
                ))

            if total_chol is not None:
                lr_id = f"LR-{uuid.uuid4().hex[:8]}"
                is_abn = float(total_chol) > 200
                statements.append((
                        """INSERT INTO lab_result (lab_result_id, lab_id, patient_id, test_name, result_value, unit, reference_range, is_abnormal)
                           VALUES (%s, %s, %s, 'Total Cholesterol', %s, 'mg/dL', '< 200', %s)""",
                        (lr_id, lab_id, patient_id, str(total_chol), is_abn)
                ))

            if hdl is not None:
                lr_id = f"LR-{uuid.uuid4().hex[:8]}"
                is_abn = float(hdl) < 40
                statements.append((
                        """INSERT INTO lab_result (lab_result_id, lab_id, patient_id, test_name, result_value, unit, reference_range, is_abnormal)
                           VALUES (%s, %s, %s, 'HDL Cholesterol', %s, 'mg/dL', '> 40', %s)""",
                        (lr_id, lab_id, patient_id, str(hdl), is_abn)
                ))

            if ldl is not None:
                lr_id = f"LR-{uuid.uuid4().hex[:8]}"
                is_abn = float(ldl) >= 100
                statements.append((
                        """INSERT INTO lab_result (lab_result_id, lab_id, patient_id, test_name, result_value, unit, reference_range, is_abnormal)
                           VALUES (%s, %s, %s, 'LDL Cholesterol', %s, 'mg/dL', '< 100', %s)""",
                        (lr_id, lab_id, patient_id, str(ldl), is_abn)
                ))

        # Create or update only health-profile fields explicitly supplied by the form.
        health_profile_values = {}
        if 'knownConditions' in data:
            conditions = data.get('knownConditions')
            if isinstance(conditions, list) and all(isinstance(item, str) for item in conditions):
                health_profile_values['chronic_conditions'] = ', '.join(conditions) or None
            elif isinstance(conditions, str):
                health_profile_values['chronic_conditions'] = conditions.strip() or None
            elif conditions is not None:
                return jsonify({'error': 'Known conditions must be a list of text values.'}), 400
        for request_field, column in (
            ('allergies', 'allergies'),
            ('currentMedications', 'current_medications'),
            ('familyHistory', 'family_history'),
        ):
            value = data.get(request_field)
            if request_field in data and value is not None:
                if not isinstance(value, str):
                    return jsonify({'error': f'{request_field} must be text.'}), 400
                health_profile_values[column] = value.strip() or None
        if health_profile_values:
            prof_id = f"HP-{int(time.time())}-{uuid.uuid4().hex[:6]}"
            columns = ', '.join(health_profile_values.keys())
            placeholders = ', '.join(['%s'] * len(health_profile_values))
            updates = ', '.join(f'{column} = VALUES({column})' for column in health_profile_values)
            statements.append((
                f"INSERT INTO health_profile (profile_id, patient_id, {columns}) "
                f"VALUES (%s, %s, {placeholders}) ON DUPLICATE KEY UPDATE {updates}",
                (prof_id, patient_id, *health_profile_values.values())
            ))

        execute_transaction(statements)

        profile = {
            'dateOfBirth': date_of_birth.isoformat() if hasattr(date_of_birth, 'isoformat') else date_of_birth or user_row.get('date_of_birth'),
            'gender': gender or user_row.get('gender'),
            'bloodGroup': blood_group or user_row.get('blood_group'),
            'heightCm': float(height_cm) if height_cm is not None else float(user_row['height_cm']) if user_row.get('height_cm') is not None else None,
            'weightKg': float(weight_kg) if weight_kg is not None else float(user_row['weight_kg']) if user_row.get('weight_kg') is not None else None,
            'smokingStatus': smoking if smoking is not None else (True if user_row.get('smoking_status') == 'Smoker' else False if user_row.get('smoking_status') else None),
            'physicalActivityDays': float(activity_value) if activity_value is not None else user_row.get('physical_activity_level'),
            'emergencyContact': {
                'name': em_name or user_row.get('emergency_contact_name'),
                'phone': em_phone or user_row.get('emergency_contact_phone'),
            } if em_name or em_phone or user_row.get('emergency_contact_name') or user_row.get('emergency_contact_phone') else None,
            'knownConditions': health_profile_values.get('chronic_conditions', user_row.get('chronic_conditions')),
            'allergies': health_profile_values.get('allergies', user_row.get('allergies')),
            'currentMedications': health_profile_values.get('current_medications', user_row.get('current_medications')),
            'familyHistory': health_profile_values.get('family_history', user_row.get('family_history')),
        }

        return jsonify({
            "success": True,
            "message": "Onboarding profile saved successfully.",
            "patientId": patient_id,
            "user": {"id": userId, "patientId": patient_id, "fullName": user_row.get('full_name'), "name": user_row.get('full_name'), "email": user_row.get('email'), "profile": profile}
        }), 200

    except Exception:
        return jsonify({'error': 'Failed to save onboarding.'}), 500


def get_owned_patient_id(user_id):
    patient_row = execute_one("SELECT patient_id FROM patient WHERE user_id = %s", (user_id,))
    return patient_row.get('patient_id') if patient_row else None


@patient_bp.route('/patients/<userId>/recommendations/generate', methods=['POST'])
@token_required
def generate_patient_recommendations(userId, current_user):
    if not verify_patient_ownership(userId, current_user['id']):
        return jsonify({'error': 'Forbidden. Cannot generate recommendations for another patient.'}), 403

    patient = execute_one(
        "SELECT patient_id, date_of_birth FROM patient WHERE user_id = %s",
        (current_user['id'],)
    )
    if not patient:
        return jsonify({'error': 'Patient profile not found.'}), 404

    try:
        vital_rows = execute_query(
            """SELECT vital_id, systolic_bp, diastolic_bp
               FROM vitals WHERE patient_id = %s
               ORDER BY recorded_at DESC LIMIT 30""",
            (patient['patient_id'],)
        )
        lab_rows = execute_query(
            """SELECT lab_result_id, test_name, is_abnormal
               FROM lab_result WHERE patient_id = %s
               ORDER BY created_at DESC LIMIT 50""",
            (patient['patient_id'],)
        )
        age = None
        dob = patient.get('date_of_birth')
        if dob:
            if isinstance(dob, str):
                dob = datetime.strptime(dob[:10], '%Y-%m-%d').date()
            elif isinstance(dob, datetime):
                dob = dob.date()
            age = date.today().year - dob.year - ((date.today().month, date.today().day) < (dob.month, dob.day))

        suggestions = build_measurement_recommendations(vital_rows, lab_rows, age)
        statements = build_persistence_statements(patient['patient_id'], suggestions)
        row_counts = execute_transaction(statements) if statements else []
        created_count = sum(row_counts[::2])
        return jsonify({'success': True, 'createdCount': created_count}), 200
    except Exception:
        return jsonify({'error': 'Personalized recommendations could not be generated.'}), 500


@patient_bp.route('/patients/<userId>/vitals', methods=['POST'])
@token_required
def record_vitals(userId, current_user):
    if userId != current_user['id']:
        return jsonify({'error': 'Forbidden. Cannot update another patient\'s record.'}), 403
    data = request.get_json() or {}
    patient_id = get_owned_patient_id(userId)
    if not patient_id:
        return jsonify({'error': 'Patient profile not found.'}), 404

    fields = (
        ('systolicBp', 'systolic_bp', 50, 300, True),
        ('diastolicBp', 'diastolic_bp', 20, 200, True),
        ('heartRate', 'heart_rate', 25, 250, True),
        ('temperature', 'temperature', 30, 45, False),
        ('respiratoryRate', 'respiratory_rate', 4, 60, True),
    )
    values = {}
    for request_key, _, minimum, maximum, integer_value in fields:
        value = data.get(request_key)
        if value is None or value == '':
            continue
        try:
            number = float(value)
            if isinstance(value, bool) or not math.isfinite(number) or not minimum <= number <= maximum:
                raise ValueError
            if integer_value and not number.is_integer():
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({'error': f'{request_key} must be a valid value between {minimum} and {maximum}.'}), 400
        values[request_key] = int(number) if integer_value else number

    if not values:
        return jsonify({'error': 'Enter at least one vital measurement.'}), 400
    if ('systolicBp' in values) != ('diastolicBp' in values):
        return jsonify({'error': 'Enter both systolic and diastolic blood pressure values.'}), 400

    vital_id = f"VIT-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    database_values = [values.get(request_key) for request_key, *_ in fields]
    try:
        execute_transaction([(
            """INSERT INTO vitals (vital_id, patient_id, systolic_bp, diastolic_bp, heart_rate, temperature, respiratory_rate)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (vital_id, patient_id, *database_values)
        )])
        return jsonify({'success': True, 'vitalId': vital_id, 'recordedAt': datetime.now().isoformat()}), 201
    except Exception:
        return jsonify({'error': 'The vital measurement could not be saved.'}), 500


@patient_bp.route('/patients/<userId>/labs', methods=['POST'])
@token_required
def record_lab_result(userId, current_user):
    if userId != current_user['id']:
        return jsonify({'error': 'Forbidden. Cannot update another patient\'s record.'}), 403
    data = request.get_json() or {}
    patient_id = get_owned_patient_id(userId)
    if not patient_id:
        return jsonify({'error': 'Patient profile not found.'}), 404

    test_name = data.get('testName')
    unit = data.get('unit')
    reference_range = data.get('referenceRange')
    if not isinstance(test_name, str) or not test_name.strip() or len(test_name.strip()) > 100:
        return jsonify({'error': 'Test name is required (maximum 100 characters).'}), 400
    if not isinstance(unit, str) or not unit.strip() or len(unit.strip()) > 30:
        return jsonify({'error': 'Measurement unit is required (maximum 30 characters).'}), 400
    if reference_range is not None and (not isinstance(reference_range, str) or len(reference_range) > 50):
        return jsonify({'error': 'Reference range must be text no longer than 50 characters.'}), 400
    try:
        result_value = float(data.get('resultValue'))
        if not math.isfinite(result_value) or not 0 < result_value <= 100000:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'Result must be a valid positive numeric value.'}), 400
    is_abnormal = data.get('isAbnormal')
    if not isinstance(is_abnormal, bool):
        return jsonify({'error': 'Confirm whether the laboratory report flags this result as abnormal.'}), 400

    report_date = data.get('reportDate')
    if report_date:
        try:
            report_date = datetime.strptime(report_date, '%Y-%m-%d').date()
            if report_date > date.today():
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({'error': 'Report date must be a valid date no later than today.'}), 400
    else:
        report_date = date.today()
    lab_id = f"LAB-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    result_id = f"LR-{uuid.uuid4().hex[:12]}"
    lab_name = data.get('labName')
    if lab_name is not None and (not isinstance(lab_name, str) or len(lab_name) > 150):
        return jsonify({'error': 'Lab name must be text no longer than 150 characters.'}), 400
    try:
        execute_transaction([
            (
                """INSERT INTO lab_report (lab_id, patient_id, report_date, lab_name, report_type)
                   VALUES (%s, %s, %s, %s, %s)""",
                (lab_id, patient_id, report_date, lab_name or None, test_name.strip())
            ),
            (
                """INSERT INTO lab_result (lab_result_id, lab_id, patient_id, test_name, result_value, unit, reference_range, is_abnormal)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (result_id, lab_id, patient_id, test_name.strip(), str(result_value), unit.strip(), reference_range, is_abnormal)
            ),
        ])
        return jsonify({'success': True, 'labResultId': result_id, 'reportDate': report_date.isoformat()}), 201
    except Exception:
        return jsonify({'error': 'The lab result could not be saved.'}), 500


@patient_bp.route('/patients/<userId>/lifestyle', methods=['POST'])
@token_required
def record_lifestyle(userId, current_user):
    if userId != current_user['id']:
        return jsonify({'error': 'Forbidden. Cannot update another patient\'s record.'}), 403
    data = request.get_json() or {}
    patient_id = get_owned_patient_id(userId)
    if not patient_id:
        return jsonify({'error': 'Patient profile not found.'}), 404

    activity = data.get('physicalActivityDays')
    if activity is not None:
        try:
            activity = float(activity)
            if isinstance(data.get('physicalActivityDays'), bool) or not math.isfinite(activity) or not 0 <= activity <= 7:
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({'error': 'Physical activity must be between 0 and 7 days per week.'}), 400
    smoking_status = data.get('smokingStatus')
    if smoking_status is not None and not isinstance(smoking_status, bool):
        return jsonify({'error': 'Smoking status must be true or false.'}), 400
    if activity is None and smoking_status is None:
        return jsonify({'error': 'Enter at least one lifestyle value.'}), 400

    smoking_value = 'Smoker' if smoking_status else 'Non-smoker' if smoking_status is not None else None
    log_id = f"LIFE-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    try:
        execute_transaction([
            (
                """UPDATE patient SET physical_activity_level = COALESCE(%s, physical_activity_level),
                   smoking_status = COALESCE(%s, smoking_status) WHERE patient_id = %s""",
                (str(activity) if activity is not None else None, smoking_value, patient_id)
            ),
            (
                """INSERT INTO lifestyle_log (log_id, patient_id, physical_activity_days, smoking_status)
                   VALUES (%s, %s, %s, %s)""",
                (log_id, patient_id, activity, smoking_value)
            ),
        ])
        return jsonify({'success': True, 'logId': log_id, 'recordedAt': datetime.now().isoformat()}), 201
    except Exception:
        return jsonify({'error': 'The lifestyle entry could not be saved.'}), 500


@patient_bp.route('/patients/<userId>/recommendation-actions/<actionId>', methods=['PUT'])
@token_required
def update_recommendation_action(userId, actionId, current_user):
    if userId != current_user['id']:
        return jsonify({'error': 'Forbidden. Cannot update another patient\'s record.'}), 403
    is_completed = (request.get_json() or {}).get('isCompleted')
    if not isinstance(is_completed, bool):
        return jsonify({'error': 'isCompleted must be true or false.'}), 400
    owned_action = execute_one(
        """SELECT ra.action_id FROM recommendation_action ra
           JOIN recommendation r ON ra.recommendation_id = r.recommendation_id
           JOIN patient p ON r.patient_id = p.patient_id
           WHERE ra.action_id = %s AND p.user_id = %s""",
        (actionId, userId)
    )
    if not owned_action:
        return jsonify({'error': 'Recommendation action not found.'}), 404
    try:
        execute_write('UPDATE recommendation_action SET is_completed = %s WHERE action_id = %s', (is_completed, actionId))
        return jsonify({'success': True, 'actionId': actionId, 'isCompleted': is_completed}), 200
    except Exception:
        return jsonify({'error': 'Recommendation status could not be saved.'}), 500
