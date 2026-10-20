// Données exposées par le serveur Flask.
const API_URL = "http://" + window.location.hostname + ":5000/api/dashboard";

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setBadge(id, message, className) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.className = `badge ${className}`;
}

function formatValue(value, unit, decimals = 1) {
    if (value === null || value === undefined || value === "") return `-- ${unit}`;
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(decimals)} ${unit}` : `-- ${unit}`;
}

async function refreshClientDashboard() {
    try {
        const response = await fetch(API_URL, {
            method: "GET",
            mode: "cors",
            cache: "no-cache"
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
            throw new Error(data.message || data.error || `Erreur HTTP ${response.status}`);
        }

        // La réponse Flask contient les capteurs dans l'objet « measurement ».
        const measurement = data.measurement || {};
        const flameDetected = measurement.flame_detected === true
            || Number(measurement.flame_detected) === 1;
        const gasValue = Number(measurement.gaz ?? measurement.gas_value);
        const gasLeak = Number.isFinite(gasValue) && gasValue > 300;

        setText("client-temp", formatValue(measurement.temperature, "°C"));
        setText("client-humidity", formatValue(measurement.humidity, "%"));
        setText("client-gas", formatValue(measurement.gaz ?? measurement.gas_value, "ppm", 0));

        setBadge(
            "flame-alert-badge",
            flameDetected ? "🔥 FEU DÉTECTÉ" : "SÉCURISÉ",
            flameDetected ? "badge-danger" : "badge-success"
        );
        setBadge(
            "gas-alert-badge",
            gasLeak ? "⚠️ FUITE DE GAZ" : "SÉCURISÉ",
            gasLeak ? "badge-danger" : "badge-success"
        );
    } catch (error) {
        console.error("Erreur de synchronisation avec Flask :", error);
        setText("client-temp", "-- °C");
        setText("client-humidity", "-- %");
        setText("client-gas", "-- ppm");
        setBadge("flame-alert-badge", "⚠️ SERVEUR INDISPONIBLE", "badge-warning");
        setBadge("gas-alert-badge", "⚠️ SERVEUR INDISPONIBLE", "badge-warning");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    refreshClientDashboard();
    window.setInterval(refreshClientDashboard, 1000);
});
