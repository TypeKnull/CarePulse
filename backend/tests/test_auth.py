"""
Tests for Authentication Routes and Password Security
"""

from unittest.mock import patch
from auth_utils import hash_password, verify_password, generate_jwt_token, decode_jwt_token
from db import execute_transaction

def test_password_hashing():
    pw = "SuperSecure123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    token = generate_jwt_token("USR-1234", "user@test.com", "patient")
    decoded = decode_jwt_token(token)
    assert decoded['sub'] == "USR-1234"
    assert decoded['email'] == "user@test.com"
    assert decoded['role'] == "patient"

def test_register_validation_missing_fields(client):
    response = client.post('/api/auth/register', json={"fullName": "Test"})
    assert response.status_code == 400
    assert 'error' in response.get_json()

def test_register_validation_short_password(client):
    response = client.post('/api/auth/register', json={
        "fullName": "Test User",
        "email": "test@example.com",
        "password": "123"
    })
    assert response.status_code == 400
    assert 'at least 6 characters' in response.get_json()['error']

@patch('routes.auth_routes.execute_one')
@patch('routes.auth_routes.execute_transaction')
def test_register_success(mock_transaction, mock_one, client):
    mock_one.return_value = None  # No existing user
    mock_transaction.return_value = [1, 1]

    payload = {
        "fullName": "Jane Doe",
        "email": "janedoe@example.com",
        "password": "password123"
    }
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert 'token' in data
    assert data['user']['email'] == "janedoe@example.com"
    assert data['user']['name'] == "Jane Doe"
    assert len(mock_transaction.call_args.args[0]) == 2


@patch('db.get_connection')
def test_execute_transaction_commits_all_statements(mock_get_connection):
    connection = mock_get_connection.return_value
    cursor = connection.cursor.return_value
    cursor.rowcount = 1

    results = execute_transaction([('INSERT INTO example VALUES (%s)', ('one',)), ('UPDATE example SET id=%s', ('two',))])

    assert results == [1, 1]
    assert cursor.execute.call_count == 2
    connection.commit.assert_called_once()
    connection.rollback.assert_not_called()


@patch('db.get_connection')
def test_execute_transaction_rolls_back_after_failure(mock_get_connection):
    connection = mock_get_connection.return_value
    cursor = connection.cursor.return_value
    cursor.execute.side_effect = [None, RuntimeError('write failed')]

    try:
        execute_transaction([('INSERT INTO example VALUES (%s)', ('one',)), ('UPDATE example SET id=%s', ('two',))])
    except RuntimeError as error:
        assert str(error) == 'write failed'
    else:
        raise AssertionError('Expected transaction write failure')

    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()

@patch('routes.auth_routes.execute_one')
def test_register_duplicate_email(mock_one, client):
    mock_one.return_value = {'user_id': 'USR-EXISTING'}  # Email exists

    payload = {
        "fullName": "Jane Doe",
        "email": "janedoe@example.com",
        "password": "password123"
    }
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 409
    assert 'already exists' in response.get_json()['error']

@patch('routes.auth_routes.execute_one')
def test_login_success(mock_one, client):
    hashed_pw = hash_password("mypassword")
    mock_one.return_value = {
        'user_id': 'USR-101',
        'full_name': 'Jane Doe',
        'email': 'janedoe@example.com',
        'password_hash': hashed_pw,
        'role': 'patient',
        'is_active': True,
        'patient_id': 'PAT-101',
        'height_cm': 168.0,
        'weight_kg': 65.0
    }

    response = client.post('/api/auth/login', json={
        "email": "janedoe@example.com",
        "password": "mypassword"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['user']['hasCompletedOnboarding'] is True
    assert 'token' in data


@patch('routes.auth_routes.execute_one')
def test_current_user_returns_saved_profile(mock_one, client):
    mock_one.return_value = {
        'user_id': 'USR-101',
        'full_name': 'Jane Doe',
        'email': 'janedoe@example.com',
        'role': 'patient',
        'patient_id': 'PAT-101',
        'date_of_birth': '2006-04-12',
        'gender': 'Female',
        'blood_group': 'A+',
        'height_cm': 165.0,
        'weight_kg': 60.0,
        'smoking_status': 'Non-smoker',
        'physical_activity_level': '4',
        'chronic_conditions': 'Seasonal allergies',
        'allergies': 'Pollen',
        'current_medications': 'Medication A',
        'family_history': 'No',
    }

    response = client.get('/api/auth/me', headers={
        'Authorization': f"Bearer {generate_jwt_token('USR-101', 'janedoe@example.com', 'patient')}"
    })

    assert response.status_code == 200
    profile = response.get_json()['user']['profile']
    assert profile['dateOfBirth'] == '2006-04-12'
    assert profile['gender'] == 'Female'
    assert profile['bloodGroup'] == 'A+'
    assert profile['heightCm'] == 165.0
    assert profile['allergies'] == 'Pollen'
    assert profile['currentMedications'] == 'Medication A'

@patch('routes.auth_routes.execute_one')
def test_login_invalid_password(mock_one, client):
    hashed_pw = hash_password("mypassword")
    mock_one.return_value = {
        'user_id': 'USR-101',
        'full_name': 'Jane Doe',
        'email': 'janedoe@example.com',
        'password_hash': hashed_pw,
        'role': 'patient',
        'is_active': True
    }

    response = client.post('/api/auth/login', json={
        "email": "janedoe@example.com",
        "password": "incorrectpassword"
    })
    assert response.status_code == 401
    assert 'Invalid email or password' in response.get_json()['error']
