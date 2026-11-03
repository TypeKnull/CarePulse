"""
CarePulse Authentication API Routes
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
"""

import time
import uuid
import re
from flask import Blueprint, request, jsonify
from db import execute_one, execute_transaction
from auth_utils import hash_password, verify_password, generate_jwt_token, token_required

auth_bp = Blueprint('auth_bp', __name__)

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def serialize_profile(user_row):
    date_of_birth = user_row.get('date_of_birth')
    smoking_status = user_row.get('smoking_status')
    return {
        "dateOfBirth": date_of_birth.isoformat() if hasattr(date_of_birth, 'isoformat') else date_of_birth,
        "gender": user_row.get('gender'),
        "bloodGroup": user_row.get('blood_group'),
        "heightCm": float(user_row['height_cm']) if user_row.get('height_cm') is not None else None,
        "weightKg": float(user_row['weight_kg']) if user_row.get('weight_kg') is not None else None,
        "smokingStatus": True if smoking_status == 'Smoker' else False if smoking_status else None,
        "physicalActivityDays": user_row.get('physical_activity_level'),
        "emergencyContact": {
            "name": user_row.get('emergency_contact_name'),
            "phone": user_row.get('emergency_contact_phone')
        } if user_row.get('emergency_contact_name') or user_row.get('emergency_contact_phone') else None,
        "knownConditions": user_row.get('chronic_conditions'),
        "allergies": user_row.get('allergies'),
        "currentMedications": user_row.get('current_medications'),
        "familyHistory": user_row.get('family_history'),
    }

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    full_name = (data.get('fullName') or data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not full_name:
        return jsonify({'error': 'Full name is required.'}), 400
    if not email or not EMAIL_REGEX.match(email):
        return jsonify({'error': 'A valid email address is required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    try:
        # Check if email exists
        existing = execute_one("SELECT user_id FROM user WHERE email = %s", (email,))
        if existing:
            return jsonify({'error': 'An account with this email address already exists.'}), 409

        # Generate IDs
        unique_suffix = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        user_id = f"USR-{unique_suffix}"
        patient_id = f"PAT-{unique_suffix}"
        pw_hash = hash_password(password)

        execute_transaction([
            (
                """INSERT INTO user (user_id, full_name, email, password_hash, role, is_active)
                   VALUES (%s, %s, %s, %s, 'patient', TRUE)""",
                (user_id, full_name, email, pw_hash)
            ),
            (
                """INSERT INTO patient (patient_id, user_id)
                   VALUES (%s, %s)""",
                (patient_id, user_id)
            )
        ])

        token = generate_jwt_token(user_id, email, 'patient')

        user_obj = {
            "id": user_id,
            "patientId": patient_id,
            "fullName": full_name,
            "name": full_name,
            "email": email,
            "role": "patient",
            "hasCompletedOnboarding": False
        }

        return jsonify({
            "success": True,
            "token": token,
            "user": user_obj
        }), 201

    except Exception:
        return jsonify({'error': 'Registration failed. Please try again.'}), 500


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    try:
        user_row = execute_one(
            """SELECT u.user_id, u.full_name, u.email, u.password_hash, u.role, u.is_active,
                      p.patient_id, p.date_of_birth, p.gender, p.blood_group, p.height_cm, p.weight_kg,
                      p.smoking_status, p.physical_activity_level, p.emergency_contact_name,
                      p.emergency_contact_phone, hp.chronic_conditions, hp.allergies,
                      hp.current_medications, hp.family_history
               FROM user u
               LEFT JOIN patient p ON u.user_id = p.user_id
               LEFT JOIN health_profile hp ON p.patient_id = hp.patient_id
               WHERE u.email = %s""",
            (email,)
        )

        if not user_row or not verify_password(password, user_row['password_hash']):
            return jsonify({'error': 'Invalid email or password.'}), 401

        if not user_row.get('is_active', True):
            return jsonify({'error': 'This account has been deactivated.'}), 403

        user_id = user_row['user_id']
        token = generate_jwt_token(user_id, user_row['email'], user_row.get('role', 'patient'))

        has_onboarded = bool(user_row.get('height_cm') or user_row.get('weight_kg'))

        user_obj = {
            "id": user_id,
            "patientId": user_row.get('patient_id'),
            "fullName": user_row['full_name'],
            "name": user_row['full_name'],
            "email": user_row['email'],
            "role": user_row.get('role', 'patient'),
            "hasCompletedOnboarding": has_onboarded,
            "profile": serialize_profile(user_row)
        }

        return jsonify({
            "success": True,
            "token": token,
            "user": user_obj
        }), 200

    except Exception:
        return jsonify({'error': 'Login failed. Please try again.'}), 500


@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    # Stateless JWT logout acknowledged by API
    return jsonify({"success": True, "message": "Successfully logged out."}), 200


@auth_bp.route('/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    try:
        user_row = execute_one(
            """SELECT u.user_id, u.full_name, u.email, u.role,
                      p.patient_id, p.date_of_birth, p.gender, p.blood_group,
                      p.height_cm, p.weight_kg, p.smoking_status, p.physical_activity_level,
                      p.emergency_contact_name, p.emergency_contact_phone,
                      hp.chronic_conditions, hp.allergies, hp.current_medications, hp.family_history
               FROM user u
               LEFT JOIN patient p ON u.user_id = p.user_id
               LEFT JOIN health_profile hp ON p.patient_id = hp.patient_id
               WHERE u.user_id = %s""",
            (current_user['id'],)
        )

        if not user_row:
            return jsonify({'error': 'User not found.'}), 404

        has_onboarded = bool(user_row.get('height_cm') or user_row.get('weight_kg'))

        return jsonify({
            "user": {
                "id": user_row['user_id'],
                "patientId": user_row.get('patient_id'),
                "name": user_row['full_name'],
                "fullName": user_row['full_name'],
                "email": user_row['email'],
                "role": user_row.get('role', 'patient'),
                "hasCompletedOnboarding": has_onboarded,
                "profile": serialize_profile(user_row)
            }
        }), 200

    except Exception:
        return jsonify({'error': 'Failed to retrieve user profile.'}), 500
