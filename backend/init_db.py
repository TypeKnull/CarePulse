"""
CarePulse Database Initialization Script
Executes schema.sql and seed.sql against MySQL using environment configuration.
"""
import os
import sys
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def init_database():
    host = os.getenv('DB_HOST', '127.0.0.1')
    port = int(os.getenv('DB_PORT', '3306'))
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'carepulse')

    print(f"Connecting to MySQL server at {host}:{port} as {user}...")
    try:
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            autocommit=True
        )
        cursor = conn.cursor()
        
        # 1. Execute schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        print(f"Applying schema from {schema_path}...")
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
            
        for statement in schema_sql.split(';'):
            stmt = statement.strip()
            if stmt:
                cursor.execute(stmt)
                
        # 2. Execute seed.sql
        seed_path = os.path.join(os.path.dirname(__file__), 'seed.sql')
        if os.path.exists(seed_path):
            print(f"Applying reference catalog seeds from {seed_path}...")
            with open(seed_path, 'r', encoding='utf-8') as f:
                seed_sql = f.read()
            for statement in seed_sql.split(';'):
                stmt = statement.strip()
                if stmt:
                    cursor.execute(stmt)

        print("Database schema and catalog seeds initialized successfully!")
        cursor.close()
        conn.close()
        return True
    except mysql.connector.Error as err:
        print(f"MySQL Error [{err.errno}]: {err.msg}")
        return False
    except Exception as ex:
        print(f"Unexpected error: {ex}")
        return False

if __name__ == '__main__':
    success = init_database()
    sys.exit(0 if success else 1)
