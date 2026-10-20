import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# ============================================================
# CHARGEMENT DU FICHIER .ENV
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, "config", ".env")

load_dotenv(ENV_FILE)


# ============================================================
# CONNEXION MYSQL
# ============================================================

def get_db_connection():
    """Crée et retourne une connexion à la base de données MySQL."""

    try:
        db_port = int(os.getenv("DB_PORT", "3306"))

        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "incendie_db"),
            port=db_port,
            charset="utf8mb4",
            collation="utf8mb4_general_ci"
        )

        if connection.is_connected():
            return connection

        return None

    except Error as err:
        print("❌ Erreur de connexion MySQL :", err)
        return None