import sys
import os
from flask import Flask, jsonify
from flask_cors import CORS

# Permet d'importer la configuration de la base de données située dans le dossier config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import get_db_connection

app = Flask(__name__)
# CORS permet à ton fichier index.html d'interroger ce script sans blocage de sécurité
CORS(app)

@app.route('/api/mesures', methods=['GET'])
def obtenir_mesures():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Impossible de se connecter à la base de données"}), 500
    
    # dictionary=True permet d'envoyer un format JSON propre (clé/valeur) au JavaScript
    cursor = conn.cursor(dictionary=True) 
    try:
        # Récupération de la toute dernière mesure (pour le dashboard)
        query = """
            SELECT id, device_id, temperature, humidity, gaz, flame_detected, created_at 
            FROM measurements 
            ORDER BY created_at DESC 
            LIMIT 1;
        """
        cursor.execute(query)
        resultat = cursor.fetchone()
        
        if resultat and resultat['created_at']:
            resultat['created_at'] = resultat['created_at'].isoformat()
            
        return jsonify(resultat if resultat else {})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    print("?? Serveur de base de données Python démarré sur http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
