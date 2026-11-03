"""
CarePulse Disease Risk Prediction API Routes
POST /api/predict/<disease_target>
"""

import time
import uuid
import math
from datetime import datetime
from flask import Blueprint, request, jsonify
import jwt
from ml.predictor import predict_risk
from auth_utils import extract_bearer_token, decode_jwt_token
from db import execute_one, execute_transaction
from recommendation_service import build_assessment_recommendations, build_persistence_statements

prediction_bp = Blueprint('prediction_bp', __name__)

@prediction_bp.route('/predict/<disease_target>', methods=['POST'])
def predict_disease(disease_target):
    biometrics = request.get_json() or {}
    token = extract_bearer_token(request)
    auth_header = request.headers.get('Authorization')
    user_id = None
    if auth_header and (not auth_header.startswith('Bearer ') or not token):
        return jsonify({'error': 'Invalid authentication token.'}), 401
    if token:
        try:
            payload = decode_jwt_token(token)
            user_id = payload.get('sub')
            if not user_id or (payload.get('user_id') and payload.get('user_id') != user_id):
                return jsonify({'error': 'Invalid authentication token.'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token.'}), 401
        except Exception:
            return jsonify({'error': 'Invalid authentication token.'}), 401

    required_fields = {
        'diabetes': ('age', 'bmi', 'fastingGlucose', 'systolicBp', 'physicalActivityDays', 'familyHistory'),
        'cardiovascular': ('age', 'gender', 'bmi', 'systolicBp', 'diastolicBp', 'totalCholesterol', 'hdl', 'ldl', 'smokingStatus', 'physicalActivityDays'),
        'hypertension': ('age', 'bmi', 'systolicBp', 'diastolicBp', 'smokingStatus', 'physicalActivityDays', 'familyHistory'),
    }
    if disease_target in required_fields:
        missing_fields = [field for field in required_fields[disease_target] if field not in biometrics or biometrics[field] is None]
        if missing_fields:
            return jsonify({'error': 'Missing required prediction inputs.', 'fields': missing_fields}), 400
        numeric_fields = [field for field in required_fields[disease_target] if field not in ('gender', 'smokingStatus', 'familyHistory')]
        if any(not isinstance(biometrics[field], (int, float)) or not math.isfinite(biometrics[field]) for field in numeric_fields):
            return jsonify({'error': 'Prediction inputs must contain valid numeric values.'}), 400

    try:
        # 1. Run ML inference pipeline
        result = predict_risk(disease_target, biometrics)

        assessment_id = f"PRED-{disease_target[:3].upper()}-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
        assessed_at = datetime.utcnow().isoformat() + "Z"

        response_payload = {
            "success": True,
            "assessmentId": assessment_id,
            "assessedAt": assessed_at,
            "disease": result["disease"],
            "diseaseTitle": result["diseaseTitle"],
            "riskScore": result["riskScore"],
            "riskCategory": result["riskCategory"],
            "confidenceInterval": result["confidenceInterval"],
            "modelVersion": result["modelVersion"],
            "suggestedSpecialist": result["suggestedSpecialist"],
            "featureContributions": result["featureContributions"],
            "recommendations": result["recommendations"],
            "recordSaved": False,
            "isRealBackend": True
        }

        # 2. Persist to MySQL if authenticated patient
        if user_id:
            try:
                patient_row = execute_one("SELECT patient_id FROM patient WHERE user_id = %s", (user_id,))
                model_row = execute_one("SELECT model_id FROM disease_model WHERE disease_name = %s", (result["disease"],))
                if patient_row and model_row:
                    statements = [(
                        """INSERT INTO prediction (prediction_id, patient_id, model_id, risk_score, risk_category, result_summary)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (assessment_id, patient_row['patient_id'], model_row['model_id'], result["riskScore"], result["riskCategory"],
                         f"Assessed {result['diseaseTitle']} with {result['riskScore']}% risk score.")
                    )]
                    for factor in result.get("featureContributions", []):
                        fid = f"FACT-{uuid.uuid4().hex[:8]}"
                        statements.append((
                            """INSERT INTO prediction_factor (factor_id, prediction_id, factor_name, impact_score, impact)
                               VALUES (%s, %s, %s, %s, %s)""",
                            (fid, assessment_id, factor.get('factor', 'Metric'), factor.get('contribution', 0), factor.get('impact', 'Moderate'))
                        ))
                    assessment_recommendations = build_assessment_recommendations(
                        {**result, 'diseaseTitle': result['diseaseTitle']}, assessment_id
                    )
                    statements.extend(build_persistence_statements(patient_row['patient_id'], assessment_recommendations))
                    execute_transaction(statements)
                    response_payload['recordSaved'] = True
                    response_payload['recommendationsSaved'] = len(assessment_recommendations)
            except Exception:
                response_payload['recordSaved'] = False
                response_payload['recommendationsSaved'] = 0

        return jsonify(response_payload), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as ex:
        return jsonify({'error': f"Prediction calculation failed: {str(ex)}"}), 500
