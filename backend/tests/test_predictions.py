"""
Tests for ML Disease Risk Prediction Endpoints
POST /api/predict/<disease_target>
"""

def test_predict_diabetes_valid(client):
    payload = {
        "age": 45,
        "bmi": 28.2,
        "fastingGlucose": 112,
        "systolicBp": 126,
        "physicalActivityDays": 3.0,
        "familyHistory": True
    }
    response = client.post('/api/predict/diabetes', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['disease'] == 'diabetes'
    assert 'assessmentId' in data
    assert 'riskScore' in data
    assert 0 <= data['riskScore'] <= 100
    assert data['riskCategory'] in ['Low Risk', 'Moderate / Borderline', 'Elevated Risk', 'High Risk']
    assert isinstance(data['confidenceInterval'], list)
    assert len(data['confidenceInterval']) == 2
    assert len(data['featureContributions']) > 0
    assert len(data['recommendations']) > 0
    assert 'RandomForestClassifier' in data['modelVersion']

def test_predict_cardiovascular_valid(client):
    payload = {
        "age": 52,
        "gender": "male",
        "systolicBp": 138,
        "diastolicBp": 88,
        "totalCholesterol": 215,
        "hdl": 42,
        "ldl": 135,
        "smokingStatus": True,
        "physicalActivityDays": 2.0,
        "bmi": 27.5
    }
    response = client.post('/api/predict/cardiovascular', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['disease'] == 'cardiovascular'
    assert 0 <= data['riskScore'] <= 100
    assert 'GradientBoostingClassifier' in data['modelVersion']

def test_predict_hypertension_valid(client):
    payload = {
        "age": 48,
        "systolicBp": 142,
        "diastolicBp": 92,
        "bmi": 29.0,
        "physicalActivityDays": 1.5,
        "smokingStatus": False,
        "familyHistory": True
    }
    response = client.post('/api/predict/hypertension', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['disease'] == 'hypertension'
    assert 0 <= data['riskScore'] <= 100

def test_predict_invalid_target(client):
    payload = {"age": 30}
    response = client.post('/api/predict/unknown_disease', json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data

def test_predict_rejects_invalid_bearer_token(client):
    response = client.post(
        '/api/predict/diabetes',
        json={'age': 45, 'bmi': 28, 'fastingGlucose': 112},
        headers={'Authorization': 'Bearer invalid-token'},
    )
    assert response.status_code == 401

def test_predict_rejects_missing_required_inputs(client):
    response = client.post('/api/predict/diabetes', json={'age': 45, 'bmi': 28})
    assert response.status_code == 400
    assert response.get_json()['fields'] == ['fastingGlucose', 'systolicBp', 'physicalActivityDays', 'familyHistory']
