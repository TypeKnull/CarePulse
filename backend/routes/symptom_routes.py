"""
CarePulse Symptom Assessment & Triage API Routes
POST /api/symptoms/assess
"""

import time
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
import jwt
from auth_utils import extract_bearer_token, decode_jwt_token
from db import execute_write, execute_one

symptom_bp = Blueprint('symptom_bp', __name__)

EMERGENCY_RED_FLAGS = [
    "chest pain", "pressure in chest", "shortness of breath",
    "difficulty breathing", "sudden numbness", "facial drooping",
    "severe headache with confusion", "loss of consciousness",
    "coughing up blood", "uncontrolled bleeding"
]

@symptom_bp.route('/symptoms/assess', methods=['POST'])
def assess_symptoms():
    payload = request.get_json() or {}
    symptoms = payload.get('selectedSymptoms') or []
    category = payload.get('category', 'general')
    severity = payload.get('severity', 'Mild')
    duration = payload.get('duration', '1 - 2 Days')
    age_group = payload.get('ageGroup')
    aggravating_factors = payload.get('aggravatingFactors') or []

    # Detect red-flag emergency symptoms
    is_emergency = False
    flagged = []
    for s in symptoms:
        s_lower = str(s).lower()
        if any(rf in s_lower for rf in EMERGENCY_RED_FLAGS):
            is_emergency = True
            flagged.append(s)

    if severity.lower() in ['severe', 'critical']:
        is_emergency = True

    if is_emergency:
        guidance = (
            "EMERGENCY ADVISORY: One or more selected symptoms indicate potentially critical "
            "hemodynamic or neurological compromise. Do not delay. Call emergency services (911/112) "
            "or proceed immediately to the nearest hospital emergency department."
        )
    elif severity.lower() == 'moderate':
        guidance = (
            "CLINICAL TRIAGE: Moderate symptoms detected. Monitor closely for changes or escalation. "
            "Schedule an appointment with your primary care clinician or visit an urgent care center "
            "if symptoms persist beyond 48–72 hours."
        )
    else:
        guidance = (
            "GENERAL ADVISORY: Mild symptoms noted. Maintain adequate hydration, rest, and observe symptom "
            "progression. If your condition deteriorates or new symptoms develop, seek medical guidance."
        )

    assessment_id = f"ASSESS-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
    timestamp = datetime.utcnow().isoformat() + "Z"

    # Anonymous assessments are allowed, but a supplied bearer token must be valid.
    token = extract_bearer_token(request)
    auth_header = request.headers.get('Authorization')
    user_id = None
    if auth_header and (not auth_header.startswith('Bearer ') or not token):
        return jsonify({'error': 'Invalid authentication token.'}), 401
    if token:
        try:
            token_payload = decode_jwt_token(token)
            user_id = token_payload.get('sub')
            if not user_id or (token_payload.get('user_id') and token_payload.get('user_id') != user_id):
                return jsonify({'error': 'Invalid authentication token.'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token.'}), 401
        except Exception:
            return jsonify({'error': 'Invalid authentication token.'}), 401

    record_saved = False
    if user_id:
        try:
            patient_row = execute_one("SELECT patient_id FROM patient WHERE user_id = %s", (user_id,))
            if patient_row:
                summary_text = f"Category: {category} | Symptoms: {', '.join(symptoms)} | Duration: {duration} | Age group: {age_group or 'Not provided'} | Associated patterns: {', '.join(aggravating_factors) or 'None recorded'}"
                execute_write(
                    """INSERT INTO symptom_check (check_id, patient_id, symptom_summary, severity, recommendation)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (assessment_id, patient_row['patient_id'], summary_text, severity, guidance)
                )
                record_saved = True
        except Exception:
            record_saved = False

    return jsonify({
        "success": True,
        "assessmentId": assessment_id,
        "timestamp": timestamp,
        "receivedSymptoms": symptoms,
        "category": category,
        "severity": severity,
        "ageGroup": age_group,
        "aggravatingFactors": aggravating_factors,
        "isEmergency": is_emergency,
        "guidance": guidance,
        "recordSaved": record_saved,
        "disclaimer": "This symptom evaluation is for preliminary informational triage and educational purposes only. It is not a clinical medical diagnosis. Consult a qualified healthcare professional for medical evaluation."
    }), 200
