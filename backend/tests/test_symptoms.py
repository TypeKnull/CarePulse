"""
Tests for Symptom Assessment & Triage
POST /api/symptoms/assess
"""

def test_symptom_assessment_routine(client):
    payload = {
        "selectedSymptoms": ["Mild Dry Cough", "Runny Nose"],
        "category": "respiratory",
        "severity": "Mild",
        "duration": "2 - 3 Days"
    }
    response = client.post('/api/symptoms/assess', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['isEmergency'] is False
    assert 'assessmentId' in data
    assert 'disclaimer' in data
    assert len(data['receivedSymptoms']) == 2

def test_symptom_assessment_emergency_red_flag(client):
    payload = {
        "selectedSymptoms": ["Severe Chest Pain", "Difficulty Breathing"],
        "category": "cardio",
        "severity": "Severe",
        "duration": "1 Hour"
    }
    response = client.post('/api/symptoms/assess', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['isEmergency'] is True
    assert 'EMERGENCY ADVISORY' in data['guidance']

def test_symptom_assessment_rejects_invalid_bearer_token(client):
    response = client.post(
        '/api/symptoms/assess',
        json={'selectedSymptoms': ['Mild Dry Cough'], 'severity': 'Mild'},
        headers={'Authorization': 'Bearer invalid-token'},
    )
    assert response.status_code == 401
