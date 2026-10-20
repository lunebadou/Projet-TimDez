-- Schéma reconstruit à partir des requêtes SQL de app.py et mqtt_listener.py
-- (aucun fichier .sql n'était fourni dans le projet).
CREATE DATABASE IF NOT EXISTS incendie_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE incendie_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','client') NOT NULL DEFAULT 'client',
    client_id INT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NULL,
    name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS capteurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NULL,
    type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS equipements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NULL,
    name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    temperature FLOAT,
    humidity FLOAT,
    gaz FLOAT,
    flame_detected TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (device_id, created_at)
);

CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    message VARCHAR(255),
    temperature FLOAT,
    humidity FLOAT,
    gaz_value FLOAT,
    flame_detected TINYINT(1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

-- Données de départ : un site et l'appareil n°1 (l'ESP32 envoie device_id=1 par défaut)
INSERT INTO sites (name, address, status) VALUES ('Site de test', 'Adresse test', 'active');
INSERT INTO devices (id, site_id, name, status) VALUES (1, 1, 'ESP32 principal', 'offline');
