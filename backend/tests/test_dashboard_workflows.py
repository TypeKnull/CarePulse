from unittest.mock import patch

from auth_utils import generate_jwt_token
from health_index import calculate_health_index


def headers(user_id='USR-55'):
    token = generate_jwt_token(user_id, 'user@test.invalid', 'patient')
    return {'Authorization': f'Bearer {token}'}


def test_health_index_requires_at_least_two_inputs():
    result = calculate_health_index(None, None, 90, None, None, None)
    assert result['score'] is None
    assert len(result['components']) == 1


def test_health_index_averages_only_available_components():
    result = calculate_health_index(118, 76, 90, None, None, 42)
    assert result['score'] == 100
    assert [item['name'] for item in result['components']] == ['Blood pressure', 'Fasting glucose']
    assert result['disclaimer'].startswith('Experimental wellness indicator')


@patch('routes.patient_routes.execute_transaction')
@patch('routes.patient_routes.execute_one', return_value={'patient_id': 'PAT-55'})
def test_vitals_are_saved_as_timestamped_measurement(mock_one, mock_transaction, client):
    response = client.post('/api/patients/USR-55/vitals', headers=headers(), json={
        'systolicBp': 120, 'diastolicBp': 80, 'heartRate': 72,
    })
    assert response.status_code == 201
    sql, params = mock_transaction.call_args.args[0][0]
    assert 'INSERT INTO vitals' in sql
    assert params[1] == 'PAT-55'
    assert response.get_json()['recordedAt']


@patch('routes.patient_routes.execute_transaction')
@patch('routes.patient_routes.execute_one', return_value={'patient_id': 'PAT-55'})
def test_vitals_reject_partial_blood_pressure(mock_one, mock_transaction, client):
    response = client.post('/api/patients/USR-55/vitals', headers=headers(), json={'systolicBp': 120})
    assert response.status_code == 400
    mock_transaction.assert_not_called()


@patch('routes.patient_routes.execute_transaction')
@patch('routes.patient_routes.execute_one', return_value={'patient_id': 'PAT-55'})
def test_lab_result_and_report_save_atomically(mock_one, mock_transaction, client):
    response = client.post('/api/patients/USR-55/labs', headers=headers(), json={
        'testName': 'Fasting blood glucose', 'resultValue': 50, 'unit': 'mg/dL',
        'referenceRange': '70-99', 'reportDate': '2026-10-14', 'isAbnormal': True,
    })
    assert response.status_code == 201
    statements = mock_transaction.call_args.args[0]
    assert len(statements) == 2
    assert 'INSERT INTO lab_report' in statements[0][0]
    assert 'INSERT INTO lab_result' in statements[1][0]


@patch('routes.patient_routes.execute_transaction')
@patch('routes.patient_routes.execute_one', return_value={'patient_id': 'PAT-55'})
def test_lifestyle_entry_persists_history_and_current_profile(mock_one, mock_transaction, client):
    response = client.post('/api/patients/USR-55/lifestyle', headers=headers(), json={
        'physicalActivityDays': 3.5, 'smokingStatus': False,
    })
    assert response.status_code == 201
    statements = mock_transaction.call_args.args[0]
    assert len(statements) == 2
    assert 'UPDATE patient' in statements[0][0]
    assert 'INSERT INTO lifestyle_log' in statements[1][0]


@patch('routes.patient_routes.execute_write')
@patch('routes.patient_routes.execute_one', return_value={'action_id': 'ACT-1'})
def test_recommendation_completion_is_owner_scoped_and_persisted(mock_one, mock_write, client):
    response = client.put(
        '/api/patients/USR-55/recommendation-actions/ACT-1',
        headers=headers(), json={'isCompleted': True},
    )
    assert response.status_code == 200
    mock_write.assert_called_once_with(
        'UPDATE recommendation_action SET is_completed = %s WHERE action_id = %s',
        (True, 'ACT-1'),
    )


def test_dashboard_write_endpoints_reject_missing_token(client):
    response = client.post('/api/patients/USR-55/vitals', json={'heartRate': 70})
    assert response.status_code == 401
