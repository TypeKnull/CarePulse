"""
Pytest configuration and fixtures for CarePulse API
"""

import pytest
import sys
import os

# Ensure backend root is in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app

@pytest.fixture
def app():
    test_app = create_app({
        'TESTING': True,
        'SECRET_KEY': 'test-secret-key-for-carepulse-tests',
    })
    return test_app

@pytest.fixture
def client(app):
    return app.test_client()
