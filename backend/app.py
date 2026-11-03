"""
CarePulse Healthcare Platform - Flask REST API Entrypoint
Modular backend connecting React 19 Frontend to MySQL 8.0 and scikit-learn models.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Import blueprints
from routes.health import health_bp
from routes.auth_routes import auth_bp
from routes.patient_routes import patient_bp
from routes.prediction_routes import prediction_bp
from routes.symptom_routes import symptom_bp
from ml.predictor import load_models

def create_app(test_config=None):
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'carepulse_flask_secret_key_default')
    if test_config:
        app.config.update(test_config)

    # CORS configuration
    frontend_origin = os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')
    allowed_origins = [o.strip() for o in frontend_origin.split(',') if o.strip()]
    if 'http://localhost:5173' not in allowed_origins:
        allowed_origins.append('http://localhost:5173')

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Register blueprints under /api prefix
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(patient_bp, url_prefix='/api')
    app.register_blueprint(prediction_bp, url_prefix='/api')
    app.register_blueprint(symptom_bp, url_prefix='/api')

    # Load ML model weights on initialization
    with app.app_context():
        load_models()

    # Consistent JSON error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found', 'path': str(e)}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed for this route'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app

app = create_app()

if __name__ == '__main__':
    host = os.getenv('HOST', '127.0.0.1')
    port = int(os.getenv('PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    print(f"Starting CarePulse Healthcare API on http://{host}:{port}/api")
    app.run(host=host, port=port, debug=debug)
