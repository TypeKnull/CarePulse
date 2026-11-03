"""
Tests for Health Endpoint
GET /api/health
"""

def test_health_endpoint_structure(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['isOnline'] is True
    assert 'service' in data
    assert 'serverTime' in data
    assert 'databaseConnected' in data
    assert 'mlModelsLoaded' in data
    assert isinstance(data['mlModelsLoaded'], list)
    assert 'diabetes' in data['mlModelsLoaded']
    assert 'cardiovascular' in data['mlModelsLoaded']
    assert 'hypertension' in data['mlModelsLoaded']
