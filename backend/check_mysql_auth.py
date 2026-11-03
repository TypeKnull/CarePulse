import os
import sys
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('DB_HOST', '127.0.0.1')
port = int(os.getenv('DB_PORT', '3306'))
user = os.getenv('DB_USER', 'root')
password = os.getenv('DB_PASSWORD', '')

print(f"Testing MySQL connection to {user}@{host}:{port}...")

try:
    conn = mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        connection_timeout=3
    )
    cursor = conn.cursor()
    cursor.execute("SELECT VERSION()")
    version = cursor.fetchone()
    print(f"SUCCESS: Connected to MySQL version {version[0]}")
    cursor.close()
    conn.close()
    sys.exit(0)
except mysql.connector.Error as err:
    print(f"ERROR: MySQL Connection Failed - Code {err.errno}: {err.msg}")
    sys.exit(1)
