from datetime import date
from unittest.mock import patch

from auth_utils import generate_jwt_token
from recommendation_service import (
    build_assessment_recommendations,
    build_measurement_recommendations,
    build_persistence_statements,
)


def headers(user_id='USR-55'):
    token = generate_jwt_token(user_id, 'user@test.invalid', 'patient')
    return {'Authorization': f'Bearer {token}'}


def test_assessment_recommendations_use_real_result_and_explicit_educational_source():
    items = build_assessment_recommendations({
        'disease': 'diabetes',
        'diseaseTitle': 'Diabetes Risk',
        'recommendations': [{
            'title': 'Review assessment inputs',
            'action': 'Discuss the estimate with a clinician.',
            'category': 'Clinical',
            'urgency': 'Routine',
        }],
    }, 'PRED-1')
    assert len(items) == 1
    assert items[0]['sourceId'] == 'PRED-1'
    assert 'not clinician-prescribed' in items[0]['sourceLabel']
    assert 'not a clinician-prescribed follow-up' in items[0]['description']


def test_measurement_recommendations_require_actual_elevated_or_flagged_records():
    items = build_measurement_recommendations(
        [{'vital_id': 'VIT-1', 'systolic_bp': 135, 'diastolic_bp': 82}],
        [
            {'lab_result_id': 'LR-NORMAL', 'test_name': 'Glucose', 'is_abnormal': False},
            {'lab_result_id': 'LR-FLAGGED', 'test_name': 'Fasting glucose', 'is_abnormal': True},
        ],
        42,
    )
    assert [item['sourceId'] for item in items] == ['VIT-1', 'LR-FLAGGED']
    assert all('educational' in item['sourceLabel'] for item in items)
    assert build_measurement_recommendations(
        [{'vital_id': 'VIT-MINOR', 'systolic_bp': 135, 'diastolic_bp': 82}], [], 17
    ) == []


def test_persistence_statements_have_stable_ids_and_duplicate_protection():
    item = build_assessment_recommendations({
        'diseaseTitle': 'Diabetes Risk',
        'recommendations': [{'title': 'Review inputs', 'action': 'Discuss them.'}],
    }, 'PRED-SAME')[0]
    first = build_persistence_statements('PAT-55', [item])
    second = build_persistence_statements('PAT-55', [item])
    assert first == second
    assert len(first) == 2
    assert all('ON DUPLICATE KEY UPDATE' in statement[0] for statement in first)
    assert first[0][1][1] == 'PAT-55'


@patch('routes.patient_routes.execute_transaction')
@patch('routes.patient_routes.execute_query')
@patch('routes.patient_routes.execute_one')
def test_authenticated_generation_persists_measurement_recommendations(mock_one, mock_query, mock_transaction, client):
    mock_one.return_value = {'patient_id': 'PAT-55', 'date_of_birth': date(1984, 1, 1)}
    mock_query.side_effect = [
        [{'vital_id': 'VIT-55', 'systolic_bp': 138, 'diastolic_bp': 84}],
        [{'lab_result_id': 'LR-55', 'test_name': 'Fasting glucose', 'is_abnormal': True}],
    ]
    mock_transaction.return_value = [1, 1, 1, 1]

    response = client.post('/api/patients/USR-55/recommendations/generate', headers=headers())

    assert response.status_code == 200
    assert response.get_json()['createdCount'] == 2
    statements = mock_transaction.call_args.args[0]
    assert len(statements) == 4
    assert all('INSERT INTO recommendation' in statements[index][0] for index in (0, 2))
    assert all('source_type' in statements[index][0] for index in (0, 2))


@patch('routes.patient_routes.execute_one', return_value=None)
def test_recommendation_generation_rejects_other_patient(mock_one, client):
    response = client.post(
        '/api/patients/USR-OTHER/recommendations/generate',
        headers=headers('USR-55'),
    )
    assert response.status_code == 403
    mock_one.assert_called_once()


@patch('routes.patient_routes.execute_transaction')
@patch('routes.patient_routes.execute_query', return_value=[])
@patch('routes.patient_routes.execute_one', return_value={'patient_id': 'PAT-55', 'date_of_birth': None})
def test_recommendation_generation_keeps_empty_state_without_qualifying_records(mock_one, mock_query, mock_transaction, client):
    response = client.post('/api/patients/USR-55/recommendations/generate', headers=headers())
    assert response.status_code == 200
    assert response.get_json()['createdCount'] == 0
    mock_transaction.assert_not_called()


@patch('routes.patient_routes.execute_query', return_value=[])
@patch('routes.patient_routes.execute_one', return_value={
    'user_id': 'USR-55', 'full_name': 'Test Patient', 'email': 'user@test.invalid',
    'patient_id': 'PAT-55', 'height_cm': None, 'weight_kg': None,
})
def test_dashboard_keeps_recommendation_and_appointment_empty_states(mock_one, mock_query, client):
    response = client.get('/api/patients/USR-55/dashboard', headers=headers())
    assert response.status_code == 200
    data = response.get_json()
    assert data['recommendations'] == []
    assert data['upcomingCare']['appointment'] is None
    assert data['upcomingCare']['suggestedFollowUps'] == []


@patch('routes.prediction_routes.predict_risk')
@patch('routes.prediction_routes.execute_transaction')
@patch('routes.prediction_routes.execute_one')
def test_authenticated_prediction_saves_recommendations_atomically(mock_one, mock_transaction, mock_predict, client):
    mock_one.side_effect = [{'patient_id': 'PAT-55'}, {'model_id': 'MODEL-1'}]
    mock_predict.return_value = {
        'disease': 'diabetes',
        'diseaseTitle': 'Diabetes Risk',
        'riskScore': 42,
        'riskCategory': 'Moderate / Borderline',
        'confidenceInterval': [35, 49],
        'modelVersion': 'test-model',
        'suggestedSpecialist': 'Primary care',
        'featureContributions': [{'factor': 'Fasting glucose', 'contribution': 40, 'impact': 'Moderate'}],
        'recommendations': [{'title': 'Review assessment inputs', 'action': 'Discuss the estimate.', 'category': 'Clinical', 'urgency': 'Routine'}],
    }
    mock_transaction.return_value = [1] * 6
    payload = {
        'age': 42, 'bmi': 25, 'fastingGlucose': 105, 'systolicBp': 130,
        'physicalActivityDays': 3, 'familyHistory': False,
    }

    response = client.post('/api/predict/diabetes', json=payload, headers=headers())

    assert response.status_code == 200
    data = response.get_json()
    assert data['recordSaved'] is True
    assert data['recommendationsSaved'] == 1
    statements = mock_transaction.call_args.args[0]
    assert any('INSERT INTO prediction (' in sql for sql, _ in statements)
    assert any('INSERT INTO prediction_factor' in sql for sql, _ in statements)
    assert any('INSERT INTO recommendation' in sql for sql, _ in statements)
    assert any('INSERT INTO recommendation_action' in sql for sql, _ in statements)


def test_recommendation_generation_requires_authentication(client):
    response = client.post('/api/patients/USR-55/recommendations/generate', json={})
    assert response.status_code == 401
