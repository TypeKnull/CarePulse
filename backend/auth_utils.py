"""
CarePulse Authentication & Security Utilities
JWT token management, password hashing, and role/authorization decorators.
"""

import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'carepulse_dev_jwt_secret_change_in_production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2/SHA256."""
    return generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored hash."""
    return check_password_hash(hashed_password, plain_password)

def generate_jwt_token(user_id: str, email: str, role: str = 'patient') -> str:
    """Generates a signed JWT bearer token."""
    now = datetime.utcnow()
    payload = {
        'sub': user_id,
        'user_id': user_id,
        'email': email,
        'role': role,
        'iat': now,
        'exp': now + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str):
    """Decodes and validates a JWT token. Returns dict payload or raises exception."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

def extract_bearer_token(request_obj):
    """Extracts bearer token from Authorization header or query param."""
    auth_header = request_obj.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ', 1)[1].strip()
    return None

def token_required(f):
    """
    Decorator enforcing valid JWT authentication on API endpoints.
    Injects `current_user` dictionary into kwargs.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_bearer_token(request)
        if not token:
            return jsonify({'error': 'Authentication required. Missing Bearer token.'}), 401
        
        try:
            payload = decode_jwt_token(token)
            user_id = payload.get('sub')
            if not user_id or (payload.get('user_id') and payload.get('user_id') != user_id):
                return jsonify({'error': 'Invalid authentication token.'}), 401
            current_user = {
                'id': user_id,
                'email': payload.get('email'),
                'role': payload.get('role', 'patient')
            }
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token.'}), 401
        except Exception:
            return jsonify({'error': 'Invalid authentication token.'}), 401

        return f(current_user=current_user, *args, **kwargs)
    return decorated

def optional_auth(f):
    """
    Decorator for routes that can optionally identify a user if a token is present,
    without failing if anonymous.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_bearer_token(request)
        current_user = None
        if token:
            try:
                payload = decode_jwt_token(token)
                current_user = {
                    'id': payload.get('sub') or payload.get('user_id'),
                    'email': payload.get('email'),
                    'role': payload.get('role', 'patient')
                }
            except Exception:
                current_user = None
        return f(current_user=current_user, *args, **kwargs)
    return decorated
