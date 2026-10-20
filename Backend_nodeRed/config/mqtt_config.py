import os
from dotenv import load_dotenv

# Charger explicitement le .env situé dans le dossier config/
config_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(config_dir, ".env")
load_dotenv(dotenv_path=env_path)

# Configuration principale du Broker
MQTT_BROKER = os.getenv("MQTT_BROKER", "209.38.68.161")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")
MQTT_MAIN_TOPIC = os.getenv("MQTT_TOPIC", "incendie/data")

# Liste de tous les sous-topics du projet
TOPIC_OUTPUT1 = os.getenv("MQTT_TOPIC_OUTPUT1")
TOPIC_OUTPUT_DATA = os.getenv("MQTT_TOPIC_OUTPUT_DATA")
TOPIC_TEMPERATURE = os.getenv("MQTT_TOPIC_TEMPERATURE")
TOPIC_HUMIDITY = os.getenv("MQTT_TOPIC_HUMIDITY")
TOPIC_FLAME = os.getenv("MQTT_TOPIC_FLAME")
TOPIC_GAZ = os.getenv("MQTT_TOPIC_GAZ")
TOPIC_ALERTE = os.getenv("MQTT_TOPIC_ALERTE")
