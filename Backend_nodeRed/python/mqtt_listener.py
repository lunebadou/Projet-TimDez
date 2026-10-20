"""Reçoit les mesures MQTT puis les enregistre dans MySQL."""

import json
import os
import sys

import paho.mqtt.client as mqtt

# Permet d'importer les modules du dossier Backend_nodeRed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import get_db_connection
from config.mqtt_config import (
    MQTT_BROKER,
    MQTT_PASSWORD,
    MQTT_PORT,
    MQTT_USER,
    TOPIC_OUTPUT_DATA,
)


# ============================================================
# CONVERSION DE LA VALEUR DU CAPTEUR DE FLAMME
# ============================================================

def as_flame_value(value):
    """Convertit les formats courants de capteur en 0 ou 1."""

    if isinstance(value, bool):
        return int(value)

    return (
        1
        if str(value).strip().lower()
        in {"1", "true", "on", "detected", "flamme"}
        else 0
    )


# ============================================================
# CONNEXION AU BROKER MQTT
# ============================================================

def on_connect(client, userdata, flags, reason_code, properties=None):

    if reason_code == 0:

        print(f"Connecte au Broker MQTT ({MQTT_BROKER}).")

        client.subscribe(TOPIC_OUTPUT_DATA)

        print(f"Abonne au topic : {TOPIC_OUTPUT_DATA}")

    else:

        print(
            f"Echec de connexion au Broker MQTT, code : {reason_code}"
        )


# ============================================================
# RECEPTION DES MESSAGES MQTT
# ============================================================

def on_message(client, userdata, msg):

    print(f"Nouveau message recu sur {msg.topic}")

    connection = None
    cursor = None

    try:

        # ----------------------------------------------------
        # DECODAGE DU MESSAGE MQTT
        # ----------------------------------------------------

        data = json.loads(
            msg.payload.decode("utf-8")
        )

        print(f"Donnees recues : {data}")

        # ----------------------------------------------------
        # RECUPERATION DES DONNEES
        # ----------------------------------------------------

        device_id = data.get("device_id", 1)

        temperature = data.get("temperature")

        humidity = data.get(
            "humidity",
            data.get("humidite")
        )

        # Ton ESP32 utilise actuellement "gaz".
        # On accepte aussi "gas" et "gas_value"
        # pour conserver une certaine compatibilite.
        gaz = data.get(
            "gaz",
            data.get(
                "gas",
                data.get("gas_value")
            )
        )

        flame_detected = as_flame_value(
            data.get(
                "flamme",
                data.get(
                    "flame",
                    data.get(
                        "flame_detected",
                        0
                    )
                )
            )
        )

        # ----------------------------------------------------
        # CONNEXION MYSQL
        # ----------------------------------------------------

        connection = get_db_connection()

        if connection is None:

            print(
                "Impossible de joindre MySQL : "
                "mesure non enregistree."
            )

            return

        cursor = connection.cursor()

        # ----------------------------------------------------
        # DERNIERE VALEUR DE FLAMME CONNUE
        # ----------------------------------------------------
        #
        # On consulte la mesure precedente de cet appareil
        # AVANT d'inserer la nouvelle, afin de detecter un
        # nouveau front montant (0 -> 1) de la flamme.
        #

        cursor.execute(
            """
            SELECT flame_detected
            FROM measurements
            WHERE device_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (device_id,),
        )

        previous_row = cursor.fetchone()

        previous_flame_detected = (
            int(previous_row[0])
            if previous_row and previous_row[0] is not None
            else 0
        )

        # ----------------------------------------------------
        # ENREGISTREMENT DE LA MESURE
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO measurements
                (
                    device_id,
                    temperature,
                    humidity,
                    gaz,
                    flame_detected
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            """,
            (
                device_id,
                temperature,
                humidity,
                gaz,
                flame_detected,
            ),
        )

        # ----------------------------------------------------
        # MISE A JOUR DE L'ETAT DE L'APPAREIL
        # ----------------------------------------------------
        #
        # La table actuelle est "devices".
        # L'ancienne table "capteurs" n'est plus utilisée.
        #

        cursor.execute(
            """
            UPDATE devices
            SET
                status = 'online',
                last_seen = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (device_id,),
        )

        # ----------------------------------------------------
        # CREATION D'UNE NOUVELLE ALERTE INCENDIE
        # ----------------------------------------------------
        #
        # Une nouvelle alerte est creee uniquement lors d'un
        # nouveau front montant de la flamme (0 -> 1), c'est
        # a dire un nouvel episode de detection.
        #
        # Si la flamme etait deja a 1 au message precedent,
        # on considere qu'il s'agit du meme episode : aucune
        # alerte supplementaire n'est creee.
        #
        # Chaque alerte reste active tant qu'un administrateur
        # ne la resout pas manuellement depuis l'interface
        # admin. Plusieurs alertes peuvent donc etre actives
        # en meme temps pour le meme appareil, si plusieurs
        # episodes de flamme se sont succede sans resolution.
        #

        new_flame_episode = (
            flame_detected == 1
            and previous_flame_detected == 0
        )

        if new_flame_episode:

            cursor.execute(
                """
                INSERT INTO alerts
                    (
                        device_id,
                        alert_type,
                        severity,
                        message,
                        temperature,
                        humidity,
                        gaz_value,
                        flame_detected,
                        status
                    )
                VALUES
                    (
                        %s,
                        'fire',
                        'critical',
                        %s,
                        %s,
                        %s,
                        %s,
                        1,
                        'active'
                    )
                """,
                (
                    device_id,
                    "Flamme detectee par le capteur",
                    temperature,
                    humidity,
                    gaz,
                ),
            )

            print("Alerte incendie active creee.")

        # ----------------------------------------------------
        # VALIDATION DES MODIFICATIONS
        # ----------------------------------------------------

        connection.commit()

        print(
            f"Mesure de l'appareil #{device_id} "
            f"enregistree "
            f"(temperature={temperature}, "
            f"humidity={humidity}, "
            f"gaz={gaz}, "
            f"flamme={flame_detected})."
        )

    # --------------------------------------------------------
    # ERREURS DE MESSAGE MQTT
    # --------------------------------------------------------

    except (
        UnicodeDecodeError,
        json.JSONDecodeError
    ) as error:

        print(
            f"Message MQTT invalide : {error}"
        )

    # --------------------------------------------------------
    # AUTRES ERREURS
    # --------------------------------------------------------

    except Exception as error:

        print(
            f"Erreur de traitement MQTT : {error}"
        )

        # Si une erreur arrive après une modification SQL,
        # on annule la transaction.
        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

    # --------------------------------------------------------
    # FERMETURE DES RESSOURCES
    # --------------------------------------------------------

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if connection:

            try:
                connection.close()
            except Exception:
                pass


# ============================================================
# DEMARRAGE DU LISTENER MQTT
# ============================================================

def main():

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2
    )

    # Authentification MQTT si nécessaire
    if MQTT_USER and MQTT_PASSWORD:

        client.username_pw_set(
            MQTT_USER,
            MQTT_PASSWORD
        )

    client.on_connect = on_connect

    client.on_message = on_message

    print(
        "Connexion au Broker MQTT en cours..."
    )

    try:

        client.connect(
            MQTT_BROKER,
            MQTT_PORT,
            60
        )

        client.loop_forever()

    except KeyboardInterrupt:

        print(
            "Arret du listener MQTT."
        )

    except Exception as error:

        print(
            f"Impossible de demarrer le listener MQTT : {error}"
        )


# ============================================================
# POINT D'ENTREE
# ============================================================

if __name__ == "__main__":

    main()