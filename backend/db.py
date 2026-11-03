"""
CarePulse Database Service Layer
Manages MySQL 8.0 connections, transactions, and parameterized query execution.
Provides graceful health verification and safe fallback handling.
"""

import os
import mysql.connector
from mysql.connector import Error, pooling
from dotenv import load_dotenv

load_dotenv()

_DB_POOL = None

def get_db_config():
    return {
        'host': os.getenv('DB_HOST', '127.0.0.1'),
        'port': int(os.getenv('DB_PORT', '3306')),
        'database': os.getenv('DB_NAME', 'carepulse'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci',
        'autocommit': True,
        'connection_timeout': 3
    }

def get_connection():
    """
    Returns a MySQL database connection using pooled or single connection.
    Raises mysql.connector.Error if database is unreachable or credentials invalid.
    """
    global _DB_POOL
    cfg = get_db_config()
    try:
        if _DB_POOL is None:
            _DB_POOL = pooling.MySQLConnectionPool(
                pool_name="carepulse_pool",
                pool_size=5,
                **cfg
            )
        return _DB_POOL.get_connection()
    except Error:
        # Fallback to direct connection if pooling failed or is full
        return mysql.connector.connect(**cfg)

def check_db_health():
    """
    Checks if MySQL server is reachable and carepulse database is available.
    Returns: (is_healthy: bool, detail: str)
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True, "MySQL database connected and operational"
    except Error as err:
        return False, f"MySQL unavailable (Code {err.errno}): {err.msg}"
    except Exception as ex:
        return False, f"Database check error: {str(ex)}"

def execute_query(sql, params=None):
    """
    Executes a SELECT query and returns list of dictionaries.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        results = cursor.fetchall()
        cursor.close()
        return results
    finally:
        conn.close()

def execute_one(sql, params=None):
    """
    Executes a SELECT query and returns a single dictionary or None.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        result = cursor.fetchone()
        cursor.close()
        return result
    finally:
        conn.close()

def execute_write(sql, params=None):
    """
    Executes an INSERT, UPDATE, or DELETE query.
    Returns rowcount.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params or ())
        rowcount = cursor.rowcount
        cursor.close()
        return rowcount
    finally:
        conn.close()

def execute_transaction(statements):
    """Executes related write statements atomically."""
    conn = get_connection()
    cursor = None
    try:
        conn.start_transaction()
        cursor = conn.cursor()
        row_counts = []
        for sql, params in statements:
            cursor.execute(sql, params or ())
            row_counts.append(cursor.rowcount)
        conn.commit()
        return row_counts
    except Exception:
        try:
            conn.rollback()
        except Error:
            pass
        raise
    finally:
        if cursor:
            cursor.close()
        conn.close()
