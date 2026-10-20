from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from config.database import get_db_connection


# ============================================================
# CONFIGURATION FLASK
# ============================================================

app = Flask(__name__)

# Autoriser les requêtes provenant du frontend
CORS(app)


# ============================================================
# OUTILS
# ============================================================

def close_db(connection, cursor=None):
    """
    Ferme proprement le curseur et la connexion MySQL.
    """

    try:
        if cursor is not None:
            cursor.close()
    except Exception:
        pass

    try:
        if connection is not None:
            connection.close()
    except Exception:
        pass


# ============================================================
# TEST API
# ============================================================

@app.route("/api/test", methods=["GET"])
def test_api():

    return jsonify({
        "success": True,
        "message": "API Flask TIMDEIZ INCENDIE opérationnelle."
    })


# ============================================================
# INSCRIPTION
# ============================================================

@app.route("/api/register", methods=["POST"])
def register():

    connection = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}

        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        role = str(data.get("role", "client")).strip().lower()

        if not name or not email or not password:

            return jsonify({
                "success": False,
                "message": "Le nom, l'email et le mot de passe sont obligatoires."
            }), 400

        if len(password) < 6:

            return jsonify({
                "success": False,
                "message": "Le mot de passe doit contenir au moins 6 caractères."
            }), 400

        if role not in ("admin", "client"):

            role = "client"

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        # Vérifier si l'email existe déjà
        cursor.execute("""
            SELECT id
            FROM users
            WHERE email = %s
            LIMIT 1
        """, (email,))

        existing_user = cursor.fetchone()

        if existing_user:

            return jsonify({
                "success": False,
                "message": "Cette adresse email est déjà utilisée."
            }), 409

        password_hash = generate_password_hash(password)

        cursor.execute("""
            INSERT INTO users
                (name, email, password, role, status)
            VALUES
                (%s, %s, %s, %s, 'active')
        """, (
            name,
            email,
            password_hash,
            role
        ))

        connection.commit()

        user_id = cursor.lastrowid

        return jsonify({
            "success": True,
            "message": "Inscription réussie.",
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": role,
                "status": "active"
            }
        }), 201

    except Exception as error:

        if connection is not None:
            try:
                connection.rollback()
            except Exception:
                pass

        print("❌ /api/register :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors de l'inscription.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# CONNEXION
# ============================================================

@app.route("/api/login", methods=["POST"])
def login():

    connection = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}

        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        if not email or not password:

            return jsonify({
                "success": False,
                "message": "Email et mot de passe obligatoires."
            }), 400

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                name,
                email,
                password,
                role,
                client_id,
                status
            FROM users
            WHERE email = %s
            LIMIT 1
        """, (email,))

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "message": "Email ou mot de passe incorrect."
            }), 401

        if user.get("status") != "active":

            return jsonify({
                "success": False,
                "message": "Ce compte n'est pas actif."
            }), 403

        if not check_password_hash(
            user["password"],
            password
        ):

            return jsonify({
                "success": False,
                "message": "Email ou mot de passe incorrect."
            }), 401

        return jsonify({
            "success": True,
            "message": "Connexion réussie.",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "client_id": user.get("client_id"),
                "status": user["status"]
            }
        })

    except Exception as error:

        print("❌ /api/login :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors de la connexion.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# PROFIL - CONSULTATION
# ============================================================

@app.route("/api/profile", methods=["GET"])
def get_profile():

    connection = None
    cursor = None

    try:

        user_id = request.args.get("user_id", type=int)

        if not user_id:

            return jsonify({
                "success": False,
                "message": "user_id est obligatoire."
            }), 400

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                name,
                email,
                role,
                client_id,
                status
            FROM users
            WHERE id = %s
            LIMIT 1
        """, (user_id,))

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "message": "Utilisateur introuvable."
            }), 404

        return jsonify({
            "success": True,
            "user": user
        })

    except Exception as error:

        print("❌ GET /api/profile :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors du chargement du profil.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# PROFIL - MODIFICATION
# ============================================================

@app.route("/api/profile", methods=["PUT"])
def update_profile():

    connection = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}

        user_id = data.get("user_id")
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):

            return jsonify({
                "success": False,
                "message": "Identifiant utilisateur invalide."
            }), 400

        if not name or not email:

            return jsonify({
                "success": False,
                "message": "Le nom et l'email sont obligatoires."
            }), 400

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        # Vérifier que l'utilisateur existe
        cursor.execute("""
            SELECT id
            FROM users
            WHERE id = %s
            LIMIT 1
        """, (user_id,))

        user_exists = cursor.fetchone()

        if not user_exists:

            return jsonify({
                "success": False,
                "message": "Utilisateur introuvable."
            }), 404

        # Vérifier que l'email n'est pas déjà utilisé
        cursor.execute("""
            SELECT id
            FROM users
            WHERE email = %s
              AND id <> %s
            LIMIT 1
        """, (
            email,
            user_id
        ))

        existing_email = cursor.fetchone()

        if existing_email:

            return jsonify({
                "success": False,
                "message": "Cette adresse email est déjà utilisée."
            }), 409

        cursor.execute("""
            UPDATE users
            SET
                name = %s,
                email = %s
            WHERE id = %s
        """, (
            name,
            email,
            user_id
        ))

        connection.commit()

        # Récupérer le profil mis à jour
        cursor.execute("""
            SELECT
                id,
                name,
                email,
                role,
                client_id,
                status
            FROM users
            WHERE id = %s
            LIMIT 1
        """, (user_id,))

        updated_user = cursor.fetchone()

        return jsonify({
            "success": True,
            "message": "Profil mis à jour avec succès.",
            "user": updated_user
        })

    except Exception as error:

        if connection is not None:
            try:
                connection.rollback()
            except Exception:
                pass

        print("❌ PUT /api/profile :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors de la modification du profil.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# CHANGEMENT DE MOT DE PASSE
# ============================================================

@app.route("/api/change-password", methods=["PUT"])
def change_password():

    connection = None
    cursor = None

    try:

        data = request.get_json(silent=True) or {}

        user_id = data.get("user_id")
        current_password = str(
            data.get("current_password", "")
        )
        new_password = str(
            data.get("new_password", "")
        )

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):

            return jsonify({
                "success": False,
                "message": "Identifiant utilisateur invalide."
            }), 400

        if not current_password or not new_password:

            return jsonify({
                "success": False,
                "message": "Les deux mots de passe sont obligatoires."
            }), 400

        if len(new_password) < 6:

            return jsonify({
                "success": False,
                "message": "Le nouveau mot de passe doit contenir au moins 6 caractères."
            }), 400

        if current_password == new_password:

            return jsonify({
                "success": False,
                "message": "Le nouveau mot de passe doit être différent de l'ancien."
            }), 400

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                password,
                status
            FROM users
            WHERE id = %s
            LIMIT 1
        """, (user_id,))

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "message": "Utilisateur introuvable."
            }), 404

        if user.get("status") != "active":

            return jsonify({
                "success": False,
                "message": "Ce compte n'est pas actif."
            }), 403

        if not check_password_hash(
            user["password"],
            current_password
        ):

            return jsonify({
                "success": False,
                "message": "Le mot de passe actuel est incorrect."
            }), 401

        new_password_hash = generate_password_hash(
            new_password
        )

        cursor.execute("""
            UPDATE users
            SET password = %s
            WHERE id = %s
        """, (
            new_password_hash,
            user_id
        ))

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Mot de passe modifié avec succès."
        })

    except Exception as error:

        if connection is not None:
            try:
                connection.rollback()
            except Exception:
                pass

        print("❌ PUT /api/change-password :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors du changement de mot de passe.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# DASHBOARD PRINCIPAL
# ============================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        # ----------------------------------------------------
        # Dernière mesure
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                device_id,
                temperature,
                humidity,
                gaz,
                flame_detected,
                created_at
            FROM measurements
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        """)

        measurement = cursor.fetchone()

        # ----------------------------------------------------
        # Nombre d'alertes actives
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM alerts
            WHERE status = 'active'
        """)

        alert_count_row = cursor.fetchone()

        active_alerts = (
            alert_count_row["total"]
            if alert_count_row
            else 0
        )

        # ----------------------------------------------------
        # Dernière alerte active
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                device_id,
                alert_type,
                severity,
                message,
                temperature,
                humidity,
                gaz_value AS gaz,
                flame_detected,
                status,
                created_at,
                resolved_at
            FROM alerts
            WHERE status = 'active'
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        """)

        active_alert = cursor.fetchone()

        return jsonify({
            "success": True,
            "activeAlerts": active_alerts,
            "active_alert": active_alert,
            "measurement": measurement
        })

    except Exception as error:

        print("❌ /api/dashboard :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors du chargement du dashboard.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# MESURES
# ============================================================

@app.route("/api/measurements", methods=["GET"])
def get_measurements():

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                device_id,
                temperature,
                humidity,
                gaz,
                flame_detected,
                created_at
            FROM measurements
            ORDER BY created_at DESC, id DESC
            LIMIT 500
        """)

        measurements = cursor.fetchall()

        return jsonify({
            "success": True,
            "measurements": measurements,
            "count": len(measurements)
        })

    except Exception as error:

        print("❌ /api/measurements :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors du chargement des mesures.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# ALERTES
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
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                device_id,
                alert_type,
                severity,
                message,
                temperature,
                humidity,
                gaz_value AS gaz,
                flame_detected,
                status,
                created_at,
                resolved_at
            FROM alerts
            ORDER BY created_at DESC, id DESC
            LIMIT 500
        """)

        alerts = cursor.fetchall()

        return jsonify({
            "success": True,
            "alerts": alerts,
            "count": len(alerts)
        })

    except Exception as error:

        print("❌ /api/alerts :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors du chargement des alertes.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# RESOLUTION MANUELLE D'UNE ALERTE
# ============================================================

@app.route("/api/alerts/<int:alert_id>/resolve", methods=["PUT"])
def resolve_alert(alert_id):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        # ----------------------------------------------------
        # Vérifier que l'alerte existe et est active
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                status
            FROM alerts
            WHERE id = %s
            LIMIT 1
        """, (alert_id,))

        alert = cursor.fetchone()

        if not alert:

            return jsonify({
                "success": False,
                "message": "Alerte introuvable."
            }), 404

        if alert["status"] != "active":

            return jsonify({
                "success": False,
                "message": "Cette alerte n'est pas active."
            }), 400

        # ----------------------------------------------------
        # Résolution manuelle
        # ----------------------------------------------------

        cursor.execute("""
            UPDATE alerts
            SET
                status = 'resolved',
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (alert_id,))

        connection.commit()

        # ----------------------------------------------------
        # Récupérer l'alerte mise à jour
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                id,
                device_id,
                alert_type,
                severity,
                message,
                temperature,
                humidity,
                gaz_value AS gaz,
                flame_detected,
                status,
                created_at,
                resolved_at
            FROM alerts
            WHERE id = %s
            LIMIT 1
        """, (alert_id,))

        updated_alert = cursor.fetchone()

        return jsonify({
            "success": True,
            "message": "Alerte résolue avec succès.",
            "alert": updated_alert
        })

    except Exception as error:

        if connection is not None:
            try:
                connection.rollback()
            except Exception:
                pass

        print("❌ PUT /api/alerts/<id>/resolve :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors de la résolution de l'alerte.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# SITES
# ============================================================

@app.route("/api/sites", methods=["GET"])
def get_sites():

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                s.id,
                s.client_id,
                s.name,
                s.address,
                s.latitude,
                s.longitude,
                s.status
            FROM sites s
            ORDER BY s.id DESC
        """)

        sites = cursor.fetchall()

        return jsonify({
            "success": True,
            "sites": sites,
            "count": len(sites)
        })

    except Exception as error:

        print("❌ /api/sites :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors du chargement des sites.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# DASHBOARD ADMINISTRATEUR
# ============================================================

@app.route("/api/admin/dashboard", methods=["GET"])
def admin_dashboard():

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            return jsonify({
                "success": False,
                "message": "Connexion MySQL impossible."
            }), 500

        cursor = connection.cursor(dictionary=True)

        # ----------------------------------------------------
        # Alertes actives
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM alerts
            WHERE status = 'active'
        """)

        row = cursor.fetchone()

        active_alerts = (
            row["total"]
            if row
            else 0
        )

        # ----------------------------------------------------
        # Nombre de sites
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM sites
        """)

        row = cursor.fetchone()

        sites_count = (
            row["total"]
            if row
            else 0
        )

        # ----------------------------------------------------
        # Nombre d'utilisateurs actifs
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM users
            WHERE status = 'active'
        """)

        row = cursor.fetchone()

        users_count = (
            row["total"]
            if row
            else 0
        )

        # ----------------------------------------------------
        # Appareils en ligne
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM devices
            WHERE status = 'online'
        """)

        row = cursor.fetchone()

        online_devices = (
            row["total"]
            if row
            else 0
        )

        # ----------------------------------------------------
        # Appareils hors ligne
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM devices
            WHERE status = 'offline'
        """)

        row = cursor.fetchone()

        offline_devices = (
            row["total"]
            if row
            else 0
        )

        # ----------------------------------------------------
        # Capteurs
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM capteurs
        """)

        row = cursor.fetchone()

        sensor_count = (
            row["total"]
            if row
            else 0
        )

        # ----------------------------------------------------
        # Équipements
        # ----------------------------------------------------

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM equipements
        """)

        row = cursor.fetchone()

        equipment_count = (
            row["total"]
            if row
            else 0
        )

        # ----------------------------------------------------
        # Réponse
        # ----------------------------------------------------

        return jsonify({
            "success": True,
            "activeAlerts": active_alerts,
            "sensors": sensor_count,
            "equipment": equipment_count,
            "users": users_count,
            "sites": sites_count,
            "onlineDevices": online_devices,
            "offlineDevices": offline_devices
        })

    except Exception as error:

        print("❌ /api/admin/dashboard :", error)

        return jsonify({
            "success": False,
            "message": "Erreur lors du chargement du dashboard administrateur.",
            "error": str(error)
        }), 500

    finally:

        close_db(connection, cursor)


# ============================================================
# ROUTE RACINE
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "application": "TIMDEIZ INCENDIE",
        "message": "Backend Flask opérationnel.",
        "api": {
            "test": "/api/test",
            "login": "/api/login",
            "register": "/api/register",
            "profile": "/api/profile",
            "change_password": "/api/change-password",
            "dashboard": "/api/dashboard",
            "admin_dashboard": "/api/admin/dashboard",
            "measurements": "/api/measurements",
            "alerts": "/api/alerts",
            "resolve_alert": "/api/alerts/<id>/resolve",
            "sites": "/api/sites"
        }
    })


# ============================================================
# GESTION DES ERREURS 404
# ============================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "success": False,
        "message": "Route API introuvable.",
        "error": "404 Not Found"
    }), 404


# ============================================================
# GESTION DES ERREURS 500
# ============================================================

@app.errorhandler(500)
def internal_error(error):

    return jsonify({
        "success": False,
        "message": "Erreur interne du serveur.",
        "error": "500 Internal Server Error"
    }), 500


# ============================================================
# LANCEMENT DU SERVEUR
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("🔥 TIMDEIZ INCENDIE - BACKEND FLASK")
    print("=" * 60)
    print("🌐 API : http://127.0.0.1:5000")
    print("📊 Dashboard : /api/dashboard")
    print("👨‍💼 Admin : /api/admin/dashboard")
    print("📡 Mesures : /api/measurements")
    print("🚨 Alertes : /api/alerts")
    print("🏢 Sites : /api/sites")
    print("👤 Profil : /api/profile")
    print("🔐 Mot de passe : /api/change-password")
    print("=" * 60)
    print()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )