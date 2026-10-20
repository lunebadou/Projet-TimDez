import sys
import os
from flask import Flask, jsonify
from flask_cors import CORS

# Permet d'importer la configuration de la base de données située dans le dossier config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import get_db_connection

# ============================================================
# CONFIGURATION FLASK
# ============================================================
app = Flask(__name__)

# Autorise la PWA / le frontend à communiquer avec Flask
CORS(app)

# ============================================================
# API DASHBOARD
# ============================================================
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()

        if connection is None:
            return jsonify({
                "error": "Impossible de se connecter à la base de données"
            }), 500

        cursor = connection.cursor(dictionary=True)

        # 1. Récupération de la dernière mesure
        cursor.execute("""
            SELECT
                temperature,
                humidity,
                gaz,
                flame_detected,
                created_at
            FROM measurements
            ORDER BY created_at DESC
            LIMIT 1
        """)

        measurement = cursor.fetchone()

        if measurement is None:
            return jsonify({
                "measurement": {},
                "activeAlerts": 0,
                "mqtt": False,
                "sensorOnline": False,
                "updatedAt": None
            })

        # 2. Recherche d'une alerte active dans la table des alertes
        cursor.execute("""
            SELECT id, device_id, alert_type, severity, message, status, created_at
            FROM alerts
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 1
        """)

        alert = cursor.fetchone()

        # Détermination de l'état d'alerte (flame_detected = 1 ou gaz critique)
        flame_physique = int(measurement["flame_detected"]) if measurement["flame_detected"] is not None else 0
        
        # Le système se met en alerte si une alerte SQL est active OU si le capteur détecte un danger matériel en direct
        alerte_active = 1 if (alert is not None or flame_physique == 1 or (measurement["gaz"] and measurement["gaz"] >= 500)) else 0

        # 3. Préparation de la réponse structurée EXACTEMENT pour app.js
        response = {
            "measurement": {
                "temperature": (
                    float(measurement["temperature"])
                    if measurement["temperature"] is not None
                    else 0.0
                ),
                "humidite": (
                    float(measurement["humidity"])
                    if measurement["humidity"] is not None
                    else 0.0
                ),
                "gaz": measurement["gaz"] if measurement["gaz"] is not None else 0,
                "flamme": flame_physique,  # Renvoie 1 ou 0 au lieu de True/False
                "alerte": alerte_active    # Renvoie 1 ou 0 au lieu de True/False
            },
            "activeAlerts": 1 if alerte_active == 1 else 0,
            "mqtt": True,            
            "sensorOnline": True,    
            "updatedAt": (
                measurement["created_at"].isoformat()
                if measurement["created_at"]
                else None
            ),
            "alert_details": alert
        }

        return jsonify(response)

    except Exception as e:
        print("Erreur /api/dashboard :", e)
        return jsonify({
            "error": "Erreur serveur",
            "message": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ============================================================
# API ALERTES
# ============================================================
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({
                "success": False,
                "error": "Impossible de se connecter à la base de données"
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                device_id,
                alert_type,
                severity,
                message,
                status,
                created_at
            FROM alerts
            ORDER BY created_at DESC
            LIMIT 50
        """)

        alerts = cursor.fetchall()

        for alert in alerts:
            if alert["created_at"]:
                alert["created_at"] = alert["created_at"].isoformat()

        return jsonify({
            "success": True,
            "count": len(alerts),
            "alerts": alerts
        })

    except Exception as e:
        print("Erreur /api/alerts :", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ============================================================
# DÉMARRAGE DU SERVEUR
# ============================================================
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
