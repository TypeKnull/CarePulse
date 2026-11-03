"""
CarePulse Health & Diagnostics Route
GET /api/health
"""

from datetime import datetime
from flask import Blueprint, jsonify
from db import check_db_health
from ml.predictor import get_loaded_models_list

health_bp = Blueprint('health_bp', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    db_ok, db_detail = check_db_health()
    loaded_models = get_loaded_models_list()
    
    return jsonify({
        "isOnline": True,
        "service": "CarePulse Healthcare REST API",
        "serverTime": datetime.utcnow().isoformat() + "Z",
        "databaseConnected": db_ok,
        "databaseDetail": db_detail,
        "mlModelsLoaded": loaded_models,
        "status": "operational" if db_ok else "database_connection_required"
    }), 200
