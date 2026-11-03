"""
Tests for Patient Dashboard Retrieval and Onboarding Persistence
GET  /api/patients/<userId>/dashboard
POST /api/patients/<userId>/onboarding
"""

from unittest.mock import patch
from datetime import datetime, timedelta, timezone
import jwt
from auth_utils import JWT_ALGORITHM, JWT_SECRET, generate_jwt_token


def auth_headers(user_id):
    token = generate_jwt_token(user_id, f'{user_id.lower()}@carepulse.internal')
    return {'Authorization': f'Bearer {token}'}

@patch('routes.patient_routes.execute_one')
@patch('routes.patient_routes.execute_query')
def test_dashboard_with_unrecorded_metrics(mock_query, mock_one, client):
    # Patient with no vitals or biometric recordings yet
    mock_one.return_value = {
        'user_id': 'USR-999',
        'full_name': 'New Patient',
        'email': 'new@carepulse.internal',
        'patient_id': 'PAT-999',
        'gender': None,
        'height_cm': None,
        'weight_kg': None,
        'smoking_status': None
    }
    mock_query.return_value = []

    response = client.get('/api/patients/USR-999/dashboard', headers=auth_headers('USR-999'))
    assert response.status_code == 200
    data = response.get_json()
    assert data['isRealBackend'] is True
    assert data['patient']['name'] == 'New Patient'
    
    # Blood pressure must be honestly reported as unrecorded / Not recorded
    bp_metric = next((m for m in data['biometrics'] if m['id'] == 'blood-pressure'), None)
    assert bp_metric is not None
    assert bp_metric['value'] == 'Not recorded'
    assert bp_metric['status'] == 'unrecorded'

@patch('routes.patient_routes.execute_one')
@patch('routes.patient_routes.execute_query')
def test_dashboard_with_recorded_vitals(mock_query, mock_one, client):
    mock_one.return_value = {
        'user_id': 'USR-101',
        'full_name': 'Recorded Patient',
        'email': 'pat@carepulse.internal',
        'patient_id': 'PAT-101',
        'gender': 'Male',
        'height_cm': 175.0,
        'weight_kg': 72.0,
        'blood_group': 'O+',
        'smoking_status': 'Non-smoker'
    }
    mock_query.side_effect = [
        # vitals_rows
        [{
            'vital_id': 'VIT-1',
            'recorded_at': '2026-10-13 10:00:00',
            'systolic_bp': 122,
            'diastolic_bp': 80,
            'heart_rate': 72,
            'temperature': 36.8,
            'respiratory_rate': 16
        }],
        # pred_rows
        [],
        # rec_rows
        [],
        # appt_rows
        [],
        # lab_rows, lifestyle_rows, symptom_rows
        [], [], []
    ]

    response = client.get('/api/patients/USR-101/dashboard', headers=auth_headers('USR-101'))
    assert response.status_code == 200
    data = response.get_json()
    assert data['patient']['bloodGroup'] == 'O+'
    
    bp_metric = next((m for m in data['biometrics'] if m['id'] == 'blood-pressure'), None)
    assert bp_metric is not None
    assert bp_metric['value'] == '122 / 80'
    assert bp_metric['systolic'] == 122

@patch('routes.patient_routes.execute_one')
@patch('routes.patient_routes.execute_transaction')
def test_onboarding_persistence(mock_transaction, mock_one, client):
    mock_one.return_value = {
        'user_id': 'USR-101',
        'patient_id': 'PAT-101'
    }
    mock_transaction.return_value = [1]

    payload = {
        "gender": "Female",
        "bloodGroup": "A+",
        "heightCm": 165,
        "weightKg": 60,
        "smokingStatus": False,
        "physicalActivityDays": 4,
        "systolicBp": 118,
        "diastolicBp": 78,
        "knownConditions": ["Mild Seasonal Allergy"],
        "dateOfBirth": "2006-04-12",
        "allergies": "Pollen",
        "currentMedications": "Medication A",
        "familyHistory": "No"
    }

    response = client.post('/api/patients/USR-101/onboarding', json=payload, headers=auth_headers('USR-101'))
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['patientId'] == 'PAT-101'
    assert data['user']['profile']['dateOfBirth'] == '2006-04-12'
    assert data['user']['profile']['allergies'] == 'Pollen'
    assert data['user']['profile']['currentMedications'] == 'Medication A'
    assert data['user']['profile']['familyHistory'] == 'No'
    statements = mock_transaction.call_args.args[0]
    assert 'COALESCE(%s, gender)' in statements[0][0]
    assert statements[0][1][0] == 'Female'
    health_profile_statement = next(statement for statement in statements if 'INSERT INTO health_profile' in statement[0])
    assert 'allergies' in health_profile_statement[0]
    assert 'current_medications' in health_profile_statement[0]
    assert 'family_history' in health_profile_statement[0]


@patch('routes.patient_routes.execute_one')
@patch('routes.patient_routes.execute_query')
def test_dashboard_low_glucose_is_not_classified_as_optimal(mock_query, mock_one, client):
    mock_one.return_value = {
        'user_id': 'USR-LOW', 'full_name': 'Patient', 'email': 'patient@test.invalid',
        'patient_id': 'PAT-LOW', 'height_cm': None, 'weight_kg': None,
    }
    mock_query.side_effect = [
        [], [], [], [],
        [{'lab_result_id': 'LR-LOW', 'test_name': 'Fasting Blood Glucose', 'result_value': '50', 'unit': 'mg/dL', 'created_at': '2026-10-14 08:00:00'}],
        [], [],
    ]
    response = client.get('/api/patients/USR-LOW/dashboard', headers=auth_headers('USR-LOW'))
    assert response.status_code == 200
    data = response.get_json()
    glucose = next(item for item in data['biometrics'] if item['id'] == 'fasting-glucose')
    assert glucose['status'] == 'urgent'
    assert 'prompt clinical assessment' in glucose['statusLabel']
    assert data['patient']['healthIndex'] is None
    assert 'complete blood pressure reading' in data['patient']['healthIndexDetails']['missingInputs']


@patch('routes.patient_routes.execute_one')
@patch('routes.patient_routes.execute_query')
def test_dashboard_does_not_apply_fasting_ranges_to_untyped_glucose(mock_query, mock_one, client):
    mock_one.return_value = {
        'user_id': 'USR-RANDOM', 'full_name': 'Patient', 'email': 'patient@test.invalid',
        'patient_id': 'PAT-RANDOM', 'height_cm': None, 'weight_kg': None,
    }
    mock_query.side_effect = [
        [], [], [], [],
        [{'lab_result_id': 'LR-RANDOM', 'test_name': 'Blood Glucose', 'result_value': '50', 'unit': 'mg/dL', 'created_at': '2026-10-14 08:00:00'}],
        [], [],
    ]
    response = client.get('/api/patients/USR-RANDOM/dashboard', headers=auth_headers('USR-RANDOM'))
    assert response.status_code == 200
    data = response.get_json()
    glucose = next(item for item in data['biometrics'] if item['id'] == 'fasting-glucose')
    assert glucose['value'] == '50'
    assert glucose['status'] == 'recorded'
    assert data['patient']['healthIndex'] is None


@patch('routes.patient_routes.execute_one')
@patch('routes.patient_routes.execute_query')
def test_dashboard_uses_only_recorded_trend_points(mock_query, mock_one, client):
    mock_one.return_value = {
        'user_id': 'USR-EMPTY', 'full_name': 'Patient', 'email': 'patient@test.invalid',
        'patient_id': 'PAT-EMPTY', 'height_cm': None, 'weight_kg': None,
    }
    mock_query.return_value = []
    response = client.get('/api/patients/USR-EMPTY/dashboard', headers=auth_headers('USR-EMPTY'))
    assert response.status_code == 200
    data = response.get_json()
    assert data['trendData']['fasting-glucose']['timeRanges']['1Y'] == []
    assert data['trendData']['blood-pressure']['timeRanges']['1Y'] == []


@patch('routes.patient_routes.execute_one')
@patch('routes.patient_routes.execute_query')
def test_dashboard_complete_mappings(mock_query, mock_one, client):
    mock_one.return_value = {
        'user_id': 'USR-200',
        'full_name': 'Mapped Patient',
        'email': 'mapped@carepulse.internal',
        'patient_id': 'PAT-200',
        'date_of_birth': '1985-05-20',
        'gender': 'Female',
        'height_cm': 168.0,
        'weight_kg': 64.0,
        'blood_group': 'B+',
        'smoking_status': 'Non-smoker',
        'physical_activity_level': '4.5 days/week',
        'updated_at': datetime(2026, 10, 13, 9, 0, 0),
    }
    mock_query.side_effect = [
        # vitals_rows
        [{
            'vital_id': 'VIT-200', 'recorded_at': datetime(2026, 10, 13, 9, 0, 0),
            'systolic_bp': 118, 'diastolic_bp': 76, 'heart_rate': 68,
            'temperature': 36.6, 'respiratory_rate': 14,
        }],
        # pred_rows
        [{
            'prediction_id': 'PRED-DIA-1', 'disease_name': 'diabetes', 'risk_score': 24.0,
            'risk_category': 'Low Risk', 'result_summary': 'Saved model result.',
            'algorithm': 'RandomForestClassifier', 'model_version': 'v1.2.0',
            'assessment_date': datetime(2026, 10, 13, 9, 30, 0),
        }],
        # rec_rows
        [{
            'recommendation_id': 'REC-1', 'title': 'Maintain Aerobic Routine',
            'description': 'Keep up regular cardio activity.', 'priority': 'Routine',
            'status': 'Active', 'source_type': 'assessment', 'source_id': 'PRED-1',
            'source_label': 'Model assessment — Diabetes Risk (educational; not clinician-prescribed)',
            'action_id': 'ACT-1', 'action_text': '150 min weekly exercise',
            'target_metric': 'Physical Activity', 'expected_impact': 'Cardiovascular health',
            'is_completed': False,
        }],
        # appt_rows
        [],
        # lab_rows
        [{
            'lab_result_id': 'LR-1',
            'test_name': 'Fasting Blood Glucose',
            'result_value': '92',
            'unit': 'mg/dL',
            'reference_range': '70 - 99',
            'is_abnormal': False,
            'created_at': datetime(2026, 10, 13, 8, 0, 0),
            'report_date': datetime(2026, 10, 13).date(),
        }, {
            'lab_result_id': 'LR-2',
            'test_name': 'Total Cholesterol',
            'result_value': '178',
            'unit': 'mg/dL',
            'reference_range': '< 200',
            'is_abnormal': False,
            'created_at': datetime(2026, 10, 13, 8, 0, 0),
            'report_date': datetime(2026, 10, 13).date(),
        }],
        # lifestyle_rows
        [],
        # symptom_rows
        [],
        # factor_map query
        [{
            'prediction_id': 'PRED-DIA-1',
            'factor_name': 'Fasting Blood Glucose',
            'impact_score': 85.0,
            'impact': 'Optimal'
        }]
    ]

    response = client.get('/api/patients/USR-200/dashboard', headers=auth_headers('USR-200'))
    assert response.status_code == 200
    data = response.get_json()
    assert data['patient']['dateOfBirth'] == '1985-05-20'
    assert isinstance(data['patient']['age'], int)
    assert data['recommendations'][0]['source'].startswith('Model assessment')
    assert data['recommendations'][0]['status'] == 'Active'

    # Check that all 6 expected biometric card IDs exist
    expected_ids = {'blood-pressure', 'fasting-glucose', 'bmi', 'total-cholesterol', 'heart-rate', 'physical-activity'}
    actual_ids = {m['id'] for m in data['biometrics']}
    assert expected_ids.issubset(actual_ids)

    # Check glucose and cholesterol mapped from lab rows
    glu = next(m for m in data['biometrics'] if m['id'] == 'fasting-glucose')
    assert glu['value'] == '92'
    assert glu['status'] == 'optimal'

    chol = next(m for m in data['biometrics'] if m['id'] == 'total-cholesterol')
    assert chol['value'] == '178'
    assert chol['status'] == 'optimal'

    hr = next(m for m in data['biometrics'] if m['id'] == 'heart-rate')
    assert hr['value'] == '68'

    act = next(m for m in data['biometrics'] if m['id'] == 'physical-activity')
    assert act['value'] == '4.5'

    # Check riskIntelligence & trendData mappings
    assert 'riskIntelligence' in data
    assert len(data['riskIntelligence']) == 1
    assert data['riskIntelligence'][0]['id'] == 'diabetes'
    assert len(data['riskIntelligence'][0]['drivers']) == 1

    assert 'trendData' in data
    assert 'blood-pressure' in data['trendData']
    assert 'fasting-glucose' in data['trendData']
    assert len(data['recentActivities']) > 0


def test_dashboard_without_token_is_rejected(client):
    response = client.get('/api/patients/USR-101/dashboard')
    assert response.status_code == 401


def test_dashboard_with_invalid_token_is_rejected(client):
    response = client.get('/api/patients/USR-101/dashboard', headers={'Authorization': 'Bearer invalid'})
    assert response.status_code == 401


def test_dashboard_with_expired_token_is_rejected(client):
    token = jwt.encode({
        'sub': 'USR-101',
        'user_id': 'USR-101',
        'exp': datetime.now(timezone.utc) - timedelta(seconds=1)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    response = client.get('/api/patients/USR-101/dashboard', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 401


@patch('routes.patient_routes.execute_one')
def test_dashboard_cannot_access_another_users_record(mock_one, client):
    mock_one.return_value = None
    response = client.get('/api/patients/USR-202/dashboard', headers=auth_headers('USR-101'))
    assert response.status_code == 403
    assert mock_one.call_count == 1


@patch('routes.patient_routes.execute_one')
def test_dashboard_allows_authenticated_users_own_patient_id(mock_one, client):
    mock_one.side_effect = [
        {'patient_id': 'PAT-101'},
        {
            'user_id': 'USR-101',
            'full_name': 'Own Patient',
            'email': 'own@carepulse.internal',
            'patient_id': 'PAT-101',
            'height_cm': None,
            'weight_kg': None,
        }
    ]
    with patch('routes.patient_routes.execute_query', return_value=[]):
        response = client.get('/api/patients/PAT-101/dashboard', headers=auth_headers('USR-101'))
    assert response.status_code == 200


@patch('routes.patient_routes.execute_one')
def test_onboarding_cannot_update_another_users_record(mock_one, client):
    response = client.post('/api/patients/USR-202/onboarding', json={}, headers=auth_headers('USR-101'))
    assert response.status_code == 403
    mock_one.assert_not_called()


@patch('routes.patient_routes.execute_transaction')
@patch('routes.patient_routes.execute_one')
def test_onboarding_rejects_future_date_of_birth(mock_one, mock_transaction, client):
    mock_one.return_value = {'user_id': 'USR-101', 'patient_id': 'PAT-101'}
    response = client.post(
        '/api/patients/USR-101/onboarding',
        json={'dateOfBirth': '2999-01-01'},
        headers=auth_headers('USR-101')
    )
    assert response.status_code == 400
    mock_transaction.assert_not_called()
