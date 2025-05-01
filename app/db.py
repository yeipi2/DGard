
import psycopg2
import psycopg2.extras
from config import Config

def get_db_connection():
    """Establece y retorna una conexión a la base de datos"""
    conn = psycopg2.connect(
        host=Config.DB_HOST,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD
    )
    return conn