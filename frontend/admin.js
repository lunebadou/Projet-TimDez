// ============================================================
// FIREWATCH / TIMDEIZ INCENDIE
// TABLEAU DE BORD ADMINISTRATEUR
// ============================================================

// ============================================================
// CONFIGURATION API FLASK
// ============================================================

const API_BASE_URL = "http://" + window.location.hostname + ":5000";

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let autoRefreshTimer = null;

// ============================================================
// UTILITAIRES
// ============================================================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// TOAST
// ============================================================

function showToast(message) {

    const toast =
        $("#toast");

    if (!toast) {

        console.log(message);

        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 2500);
}

// ============================================================
// API FLASK
// ============================================================

async function api(
    endpoint,
    options = {}
) {

    try {

        const response =
            await fetch(
                API_BASE_URL + endpoint,
                {
                    headers: {
                        "Content-Type":
                            "application/json",
                        ...(options.headers || {})
                    },
                    ...options
                }
            );

        let data = {};

        try {

            data =
                await response.json();

        } catch (error) {

            data = {
                success: false,
                message:
                    "Réponse invalide du serveur."
            };
        }

        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                `Erreur HTTP ${response.status}`
            );
        }

        return data;

    } catch (error) {

        console.error(
            `❌ Erreur API ${endpoint} :`,
            error
        );

        throw error;
    }
}

// ============================================================
// UTILISATEUR CONNECTÉ
// ============================================================

function getCurrentUser() {

    const savedUser =
        localStorage.getItem(
            "firewatch_user"
        );

    if (!savedUser) {
        return null;
    }

    try {

        return JSON.parse(
            savedUser
        );

    } catch (error) {

        console.error(
            "❌ Session utilisateur invalide :",
            error
        );

        localStorage.removeItem(
            "firewatch_user"
        );

        return null;
    }
}

// ============================================================
// VÉRIFICATION ADMIN
// ============================================================

function checkAdminAccess() {

    const user =
        getCurrentUser();

    if (!user) {

        console.warn(
            "⚠️ Aucun utilisateur connecté."
        );

        window.location.href =
            "index.html";

        return false;
    }

    if (user.role !== "admin") {

        console.warn(
            "⚠️ Accès refusé. Rôle :",
            user.role
        );

        window.location.href =
            "client.html";

        return false;
    }

    return true;
}

// ============================================================
// DÉCONNEXION
// ============================================================

function logout() {

    stopAutoRefresh();

    localStorage.removeItem(
        "firewatch_user"
    );

    window.location.href =
        "index.html";
}

// ============================================================
// AFFICHAGE UTILISATEUR
// ============================================================

function displayCurrentUser() {

    const user =
        getCurrentUser();

    if (!user) {
        return;
    }

    const name =
        user.name ||
        user.nom ||
        "Administrateur";

    const email =
        user.email ||
        "--";

    const possibleNames = [
        "adminName",
        "administratorName",
        "profileName",
        "profileNameValue",
        "userName"
    ];

    possibleNames.forEach(
        id => {

            const element =
                document.getElementById(id);

            if (element) {

                element.textContent =
                    name;
            }
        }
    );

    const possibleEmails = [
        "adminEmail",
        "profileEmail",
        "profileEmailValue",
        "userEmail"
    ];

    possibleEmails.forEach(
        id => {

            const element =
                document.getElementById(id);

            if (element) {

                element.textContent =
                    email;
            }
        }
    );
}

// ============================================================
// STATISTIQUES ADMINISTRATEUR
// ============================================================

async function loadAdminStats() {

    try {

        const data =
            await api(
                "/api/admin/dashboard"
            );

        console.log(
            "📊 Statistiques administrateur :",
            data
        );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de récupérer les statistiques."
            );
        }

        setText(
            "adminActiveAlerts",
            data.activeAlerts ?? 0
        );

        setText(
            "activeAlerts",
            data.activeAlerts ?? 0
        );

        setText(
            "adminSensors",
            data.sensors ?? 0
        );

        setText(
            "adminEquipment",
            data.equipment ?? 0
        );

        setText(
            "adminUsers",
            data.users ?? 0
        );

        setText(
            "adminSites",
            data.sites ?? 0
        );

        setText(
            "adminOnlineDevices",
            data.onlineDevices ?? 0
        );

        setText(
            "onlineDevices",
            data.onlineDevices ?? 0
        );

        setText(
            "adminOfflineDevices",
            data.offlineDevices ?? 0
        );

        setText(
            "offlineDevices",
            data.offlineDevices ?? 0
        );

        console.log(
            "✅ Statistiques administrateur actualisées."
        );

    } catch (error) {

        console.error(
            "❌ Erreur statistiques admin :",
            error
        );

        setText(
            "adminActiveAlerts",
            "--"
        );

        setText(
            "adminSensors",
            "--"
        );

        setText(
            "adminEquipment",
            "--"
        );

        setText(
            "adminUsers",
            "--"
        );

        setText(
            "adminSites",
            "--"
        );
    }
}

// ============================================================
// TABLEAU DE BORD PRINCIPAL
// ============================================================

async function loadDashboard() {

    try {

        const data =
            await api(
                "/api/dashboard"
            );

        console.log(
            "📊 Dashboard principal :",
            data
        );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de récupérer le dashboard."
            );
        }

        const measurement =
            data.measurement || {};

        // ====================================================
        // TEMPÉRATURE
        // ====================================================

        if (
            measurement.temperature !== null &&
            measurement.temperature !== undefined
        ) {

            setText(
                "temperature",
                `${Number(
                    measurement.temperature
                ).toFixed(1)} °C`
            );
        }

        // ====================================================
        // HUMIDITÉ
        // ====================================================

        if (
            measurement.humidity !== null &&
            measurement.humidity !== undefined
        ) {

            setText(
                "humidity",
                `${Number(
                    measurement.humidity
                ).toFixed(1)} %`
            );
        }

        // ====================================================
        // GAZ
        // ====================================================

        if (
            measurement.gaz !== null &&
            measurement.gaz !== undefined
        ) {

            setText(
                "gas",
                `${measurement.gaz} ppm`
            );
        }

        // ====================================================
        // FLAMME
        // ====================================================

        const flameDetected =
            (data.activeAlerts ?? 0) > 0;

        if (flameDetected) {

            setText(
                "flame",
                "Flamme détectée"
            );

            setText(
                "flameDetail",
                "⚠️ Détection de flamme"
            );

        } else {

            setText(
                "flame",
                "Aucune flamme"
            );

            setText(
                "flameDetail",
                "✅ Aucun incendie détecté"
            );
        }

        // ====================================================
        // DATE DERNIÈRE MESURE
        // ====================================================

        if (measurement.created_at) {

            setText(
                "lastUpdate",
                formatDate(
                    measurement.created_at
                )
            );
        }

        // ====================================================
        // ALERTES
        // ====================================================

        setText(
            "activeAlerts",
            data.activeAlerts ?? 0
        );

        console.log(
            "✅ Dashboard principal actualisé."
        );

    } catch (error) {

        console.error(
            "❌ Erreur dashboard :",
            error
        );
    }
}

// ============================================================
// MESURES
// ============================================================

async function loadMeasurements() {

    try {

        const data =
            await api(
                "/api/measurements"
            );

        console.log(
            "📈 Mesures reçues :",
            data
        );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de récupérer les mesures."
            );
        }

        const measurements =
            data.measurements || [];

        renderMeasurementsHistory(
            measurements
        );

    } catch (error) {

        console.error(
            "❌ Erreur mesures :",
            error
        );

        const container =
            document.getElementById(
                "measurementsHistory"
            );

        if (container) {

            container.innerHTML = `
                <p style="color:#ef4444;">
                    Impossible de charger l'historique.
                </p>
            `;
        }
    }
}

// ============================================================
// HISTORIQUE DES MESURES
// ============================================================

function renderMeasurementsHistory(
    measurements
) {

    const container =
        document.getElementById(
            "measurementsHistory"
        );

    if (!container) {
        return;
    }

    if (
        !measurements ||
        measurements.length === 0
    ) {

        container.innerHTML = `
            <p style="color:#94a3b8;">
                Aucune mesure disponible.
            </p>
        `;

        return;
    }

    const rows =
        measurements.map(
            measurement => {

                const flame =
                    measurement.flame_detected === true ||
                    measurement.flame_detected === 1 ||
                    measurement.flame_detected === "1";

                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                measurement.id
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                measurement.temperature
                            )} °C
                        </td>

                        <td>
                            ${escapeHTML(
                                measurement.humidity
                            )} %
                        </td>

                        <td>
                            ${escapeHTML(
                                measurement.gaz
                            )} ppm
                        </td>

                        <td>
                            ${
                                flame
                                    ? "🔥 Flamme"
                                    : "✅ Normal"
                            }
                        </td>

                        <td>
                            ${escapeHTML(
                                formatDate(
                                    measurement.created_at
                                )
                            )}
                        </td>

                    </tr>
                `;
            }
        ).join("");

    container.innerHTML = `
        <div style="overflow-x:auto;">

            <table>

                <thead>

                    <tr>
                        <th>ID</th>
                        <th>Température</th>
                        <th>Humidité</th>
                        <th>Gaz</th>
                        <th>Flamme</th>
                        <th>Date</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

        </div>
    `;
}

// ============================================================
// ALERTES
// ============================================================

async function loadAlerts() {

    try {

        const data =
            await api(
                "/api/alerts"
            );

        console.log(
            "🚨 Alertes reçues :",
            data
        );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de récupérer les alertes."
            );
        }

        const alerts =
            data.alerts || [];

        renderAlerts(
            alerts
        );

    } catch (error) {

        console.error(
            "❌ Erreur alertes :",
            error
        );

        const container =
            document.getElementById(
                "recentAlerts"
            );

        if (container) {

            container.innerHTML = `
                <p style="color:#ef4444;">
                    Impossible de charger les alertes.
                </p>
            `;
        }
    }
}

// ============================================================
// RÉSOLUTION MANUELLE D'UNE ALERTE
// ============================================================

async function resolveAlert(alertId) {

    if (!alertId) {
        return;
    }

    const button =
        document.querySelector(
            `.resolve-alert-button[data-alert-id="${alertId}"]`
        );

    if (button) {

        button.disabled = true;

        button.textContent =
            "Résolution...";
    }

    try {

        const data =
            await api(
                `/api/alerts/${alertId}/resolve`,
                {
                    method: "PUT"
                }
            );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de résoudre l'alerte."
            );
        }

        showToast(
            "Alerte résolue avec succès."
        );

        console.log(
            "✅ Alerte résolue :",
            alertId
        );

        // ====================================================
        // RAFRAÎCHISSEMENT DES DONNÉES CONCERNÉES
        // ====================================================

        await Promise.allSettled([

            loadAlerts(),

            loadAdminStats(),

            loadDashboard()

        ]);

    } catch (error) {

        console.error(
            "❌ Erreur résolution alerte :",
            error
        );

        showToast(
            error.message ||
            "Erreur lors de la résolution de l'alerte."
        );

        if (button) {

            button.disabled = false;

            button.textContent =
                "✅ Résoudre";
        }
    }
}

// ============================================================
// DÉLÉGATION D'ÉVÉNEMENTS - BOUTONS RÉSOUDRE
// ============================================================

function setupAlertActions() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".resolve-alert-button"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            const alertId =
                button.dataset.alertId;

            if (!alertId) {
                return;
            }

            resolveAlert(alertId);
        }
    );
}

// ============================================================
// AFFICHAGE DES ALERTES
// ============================================================

function renderAlerts(alerts) {

    const recentContainer =
        document.getElementById(
            "recentAlerts"
        );

    const alertsPageContainer =
        document.getElementById(
            "alertsContainer"
        );

    if (
        !alerts ||
        alerts.length === 0
    ) {

        if (recentContainer) {

            recentContainer.innerHTML = `
                <p style="color:#64748b;">
                    Aucune alerte enregistrée.
                </p>
            `;
        }

        if (alertsPageContainer) {

            alertsPageContainer.innerHTML = `
                <div class="table-card">

                    <p style="color:#64748b;">
                        Aucune alerte enregistrée.
                    </p>

                </div>
            `;
        }

        return;
    }

    // ========================================================
    // ALERTES RÉCENTES
    // ========================================================

    if (recentContainer) {

        const recentAlerts =
            alerts.slice(0, 5);

        recentContainer.innerHTML =
            recentAlerts.map(
                alert => {

                    const severity =
                        alert.severity ||
                        "info";

                    const status =
                        alert.status ||
                        "active";

                    const isActive =
                        status === "active";

                    return `
                        <div class="alert-item">

                            <div class="alert-title">
                                ${escapeHTML(
                                    alert.message ||
                                    "Alerte incendie"
                                )}
                            </div>

                            <div>
                                Type :
                                ${escapeHTML(
                                    alert.alert_type ||
                                    "unknown"
                                )}
                            </div>

                            <div>
                                Sévérité :
                                ${escapeHTML(
                                    severity
                                )}
                            </div>

                            <div>
                                Statut :
                                ${escapeHTML(
                                    status
                                )}
                            </div>

                            <div class="alert-date">
                                ${escapeHTML(
                                    formatDate(
                                        alert.created_at
                                    )
                                )}
                            </div>

                            ${
                                isActive
                                    ? `
                                        <div style="margin-top:10px;">
                                            <button
                                                type="button"
                                                class="resolve-alert-button"
                                                data-alert-id="${escapeHTML(
                                                    alert.id
                                                )}"
                                                style="
                                                    background:#16a34a;
                                                    color:#ffffff;
                                                    border:none;
                                                    border-radius:6px;
                                                    padding:8px 14px;
                                                    cursor:pointer;
                                                    font-weight:600;
                                                "
                                            >
                                                ✅ Résoudre
                                            </button>
                                        </div>
                                    `
                                    : ""
                            }

                        </div>
                    `;
                }
            ).join("");
    }

    // ========================================================
    // PAGE ALERTES
    // ========================================================

    if (alertsPageContainer) {

        alertsPageContainer.innerHTML = `
            <div class="table-card">

                <table>

                    <thead>

                        <tr>
                            <th>Type</th>
                            <th>Sévérité</th>
                            <th>Message</th>
                            <th>Statut</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            alerts.map(
                                alert => {

                                    const status =
                                        alert.status ||
                                        "active";

                                    const isActive =
                                        status === "active";

                                    return `
                                        <tr>

                                            <td>
                                                ${escapeHTML(
                                                    alert.alert_type ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHTML(
                                                    alert.severity ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHTML(
                                                    alert.message ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHTML(
                                                    status
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHTML(
                                                    formatDate(
                                                        alert.created_at
                                                    )
                                                )}
                                            </td>

                                            <td>
                                                ${
                                                    isActive
                                                        ? `
                                                            <button
                                                                type="button"
                                                                class="resolve-alert-button"
                                                                data-alert-id="${escapeHTML(
                                                                    alert.id
                                                                )}"
                                                                style="
                                                                    background:#16a34a;
                                                                    color:#ffffff;
                                                                    border:none;
                                                                    border-radius:6px;
                                                                    padding:6px 12px;
                                                                    cursor:pointer;
                                                                    font-weight:600;
                                                                "
                                                            >
                                                                ✅ Résoudre
                                                            </button>
                                                        `
                                                        : "-"
                                                }
                                            </td>

                                        </tr>
                                    `;
                                }
                            ).join("")
                        }

                    </tbody>

                </table>

            </div>
        `;
    }
}

// ============================================================
// SITES
// ============================================================

async function loadSites() {

    const container =
        document.getElementById(
            "sitesDetails"
        );

    const summaryContainer =
        document.getElementById(
            "sitesSummary"
        );

    try {

        if (container) {

            container.innerHTML = `
                <p style="color:#94a3b8;">
                    Chargement des sites...
                </p>
            `;
        }

        const data =
            await api(
                "/api/sites"
            );

        console.log(
            "🏢 Sites reçus :",
            data
        );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de charger les sites."
            );
        }

        const sites =
            data.sites || [];

        // ====================================================
        // AUCUN SITE
        // ====================================================

        if (sites.length === 0) {

            if (container) {

                container.innerHTML = `
                    <div class="table-card">

                        <p style="color:#64748b;">
                            Aucun site enregistré.
                        </p>

                    </div>
                `;
            }

            if (summaryContainer) {

                summaryContainer.innerHTML = `
                    <p style="color:#64748b;">
                        Aucun site surveillé.
                    </p>
                `;
            }

            return;
        }

        // ====================================================
        // RÉSUMÉ
        // ====================================================

        if (summaryContainer) {

            summaryContainer.innerHTML = `
                <p>
                    <strong>
                        ${sites.length}
                    </strong>
                    site(s) surveillé(s)
                </p>
            `;
        }

        // ====================================================
        // TABLEAU
        // ====================================================

        if (container) {

            const rows =
                sites.map(
                    site => {

                        let statusText =
                            "⚪ Inconnu";

                        if (
                            site.status === "ok"
                        ) {

                            statusText =
                                "🟢 Normal";

                        } else if (
                            site.status === "alert"
                        ) {

                            statusText =
                                "🟠 Alerte";

                        } else if (
                            site.status === "fire"
                        ) {

                            statusText =
                                "🔴 Incendie";

                        } else if (
                            site.status === "offline"
                        ) {

                            statusText =
                                "⚫ Hors ligne";
                        }

                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        site.id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            site.name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        site.address || "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        site.client_id || "-"
                                    )}
                                </td>

                                <td>
                                    ${statusText}
                                </td>

                            </tr>
                        `;
                    }
                ).join("");

            container.innerHTML = `
                <div class="table-card">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:20px;
                    ">

                        <div>

                            <h3>
                                Sites surveillés
                            </h3>

                            <p style="
                                color:#64748b;
                                margin:5px 0 0 0;
                            ">
                                ${sites.length}
                                site(s) enregistré(s)
                            </p>

                        </div>

                    </div>

                    <div style="
                        overflow-x:auto;
                    ">

                        <table>

                            <thead>

                                <tr>
                                    <th>ID</th>
                                    <th>Nom</th>
                                    <th>Adresse</th>
                                    <th>Client</th>
                                    <th>État</th>
                                </tr>

                            </thead>

                            <tbody>
                                ${rows}
                            </tbody>

                        </table>

                    </div>

                </div>
            `;
        }

        console.log(
            "✅ Sites chargés :",
            sites.length
        );

    } catch (error) {

        console.error(
            "❌ Erreur chargement sites :",
            error
        );

        if (container) {

            container.innerHTML = `
                <div class="table-card">

                    <p style="color:#ef4444;">
                        ❌ Impossible de charger les sites.
                    </p>

                    <p style="
                        color:#94a3b8;
                        margin-top:8px;
                    ">
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>
            `;
        }

        if (summaryContainer) {

            summaryContainer.innerHTML = `
                <p style="color:#ef4444;">
                    Erreur de chargement.
                </p>
            `;
        }
    }
}

// ============================================================
// PROFIL
// ============================================================

async function loadProfile() {

    try {

        const user =
            getCurrentUser();

        if (!user) {
            return;
        }

        displayCurrentUser();

        console.log(
            "👤 Profil administrateur :",
            user
        );

    } catch (error) {

        console.error(
            "❌ Erreur profil :",
            error
        );
    }
}

// ============================================================
// MODIFICATION DU PROFIL
// ============================================================

function openProfileModal() {

    const user =
        getCurrentUser();

    if (!user) {
        return;
    }

    const modal =
        document.getElementById(
            "profileModal"
        );

    const nameInput =
        document.getElementById(
            "profileNameInput"
        );

    const emailInput =
        document.getElementById(
            "profileEmailInput"
        );

    if (!modal) {
        return;
    }

    if (nameInput) {

        nameInput.value =
            user.name ||
            user.nom ||
            "";
    }

    if (emailInput) {

        emailInput.value =
            user.email ||
            "";
    }

    modal.classList.add(
        "open"
    );
}

// ============================================================
// FERMER MODALE PROFIL
// ============================================================

function closeProfileModal() {

    const modal =
        document.getElementById(
            "profileModal"
        );

    if (modal) {

        modal.classList.remove(
            "open"
        );
    }
}

// ============================================================
// ENREGISTRER LE PROFIL
// ============================================================

async function saveProfile(event) {

    event.preventDefault();

    const user =
        getCurrentUser();

    if (!user) {
        return;
    }

    const nameInput =
        document.getElementById(
            "profileNameInput"
        );

    const emailInput =
        document.getElementById(
            "profileEmailInput"
        );

    const name =
        nameInput
            ? nameInput.value.trim()
            : "";

    const email =
        emailInput
            ? emailInput.value.trim()
            : "";

    if (!name || !email) {

        showToast(
            "Veuillez remplir tous les champs."
        );

        return;
    }

    const saveButton =
        document.getElementById(
            "saveProfileButton"
        );

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Enregistrement...";
    }

    try {

        const payload = {
            user_id: user.id,
            name: name,
            email: email
        };

        const data =
            await api(
                "/api/profile",
                {
                    method: "PUT",
                    body: JSON.stringify(
                        payload
                    )
                }
            );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de modifier le profil."
            );
        }

        const updatedUser = {
            ...user,
            name: name,
            email: email
        };

        localStorage.setItem(
            "firewatch_user",
            JSON.stringify(
                updatedUser
            )
        );

        displayCurrentUser();

        closeProfileModal();

        showToast(
            "Profil modifié avec succès."
        );

    } catch (error) {

        console.error(
            "❌ Erreur modification profil :",
            error
        );

        showToast(
            error.message ||
            "Erreur lors de la modification du profil."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Enregistrer les modifications";
        }
    }
}

// ============================================================
// CRÉATION DE LA MODALE MOT DE PASSE
// ============================================================

function createPasswordModal() {

    if (
        document.getElementById(
            "passwordModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "passwordModal";

    modal.innerHTML = `
        <div class="password-modal-content">

            <div class="password-modal-header">

                <div>

                    <h2>
                        Modifier le mot de passe
                    </h2>

                    <p>
                        Sécurisez votre compte administrateur.
                    </p>

                </div>

                <button
                    type="button"
                    id="closePasswordModal"
                    class="password-close-button"
                    aria-label="Fermer"
                >
                    ×
                </button>

            </div>

            <form id="passwordForm">

                <div class="password-form-group">

                    <label for="currentPassword">
                        Ancien mot de passe
                    </label>

                    <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        placeholder="Entrez votre ancien mot de passe"
                        autocomplete="current-password"
                        required
                    >

                </div>

                <div class="password-form-group">

                    <label for="newPassword">
                        Nouveau mot de passe
                    </label>

                    <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        placeholder="Minimum 6 caractères"
                        autocomplete="new-password"
                        minlength="6"
                        required
                    >

                </div>

                <div class="password-form-group">

                    <label for="confirmPassword">
                        Confirmer le nouveau mot de passe
                    </label>

                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="Confirmez le nouveau mot de passe"
                        autocomplete="new-password"
                        minlength="6"
                        required
                    >

                </div>

                <div
                    id="passwordError"
                    class="password-error"
                    style="display:none;"
                ></div>

                <div class="password-modal-actions">

                    <button
                        type="button"
                        id="cancelPasswordButton"
                        class="password-cancel-button"
                    >
                        Annuler
                    </button>

                    <button
                        type="submit"
                        id="savePasswordButton"
                        class="password-save-button"
                    >
                        Modifier le mot de passe
                    </button>

                </div>

            </form>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    // ========================================================
    // STYLE MODALE
    // ========================================================

    const style =
        document.createElement("style");

    style.id =
        "passwordModalStyles";

    style.textContent = `
        #passwordModal {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(0, 0, 0, 0.65);
        }

        #passwordModal.open {
            display: flex;
        }

        .password-modal-content {
            width: 100%;
            max-width: 500px;
            background: #ffffff;
            border-radius: 16px;
            padding: 25px;
            box-shadow:
                0 20px 60px
                rgba(0, 0, 0, 0.30);
        }

        .password-modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 25px;
        }

        .password-modal-header h2 {
            margin: 0 0 6px 0;
            font-size: 22px;
        }

        .password-modal-header p {
            margin: 0;
            color: #64748b;
            font-size: 14px;
        }

        .password-close-button {
            border: none;
            background: transparent;
            font-size: 30px;
            line-height: 1;
            cursor: pointer;
            color: #64748b;
        }

        .password-form-group {
            margin-bottom: 18px;
        }

        .password-form-group label {
            display: block;
            margin-bottom: 7px;
            font-weight: 600;
        }

        .password-form-group input {
            width: 100%;
            box-sizing: border-box;
            padding: 12px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
        }

        .password-form-group input:focus {
            border-color: #2563eb;
        }

        .password-error {
            margin-bottom: 15px;
            padding: 10px 12px;
            border-radius: 8px;
            background: #fee2e2;
            color: #b91c1c;
            font-size: 14px;
        }

        .password-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 25px;
        }

        .password-cancel-button,
        .password-save-button {
            border: none;
            border-radius: 8px;
            padding: 11px 16px;
            cursor: pointer;
            font-weight: 600;
        }

        .password-cancel-button {
            background: #e2e8f0;
            color: #334155;
        }

        .password-save-button {
            background: #2563eb;
            color: white;
        }

        .password-save-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        @media (max-width: 600px) {

            .password-modal-content {
                padding: 20px;
            }

            .password-modal-actions {
                flex-direction: column;
            }

            .password-cancel-button,
            .password-save-button {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(
        style
    );

    // ========================================================
    // FERMER
    // ========================================================

    const closeButton =
        document.getElementById(
            "closePasswordModal"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closePasswordModal
        );
    }

    // ========================================================
    // ANNULER
    // ========================================================

    const cancelButton =
        document.getElementById(
            "cancelPasswordButton"
        );

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closePasswordModal
        );
    }

    // ========================================================
    // CLIC ARRIÈRE-PLAN
    // ========================================================

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closePasswordModal();
            }
        }
    );

    // ========================================================
    // FORMULAIRE
    // ========================================================

    const form =
        document.getElementById(
            "passwordForm"
        );

    if (form) {

        form.addEventListener(
            "submit",
            changePassword
        );
    }
}

// ============================================================
// OUVRIR MODALE MOT DE PASSE
// ============================================================

function openPasswordModal() {

    createPasswordModal();

    const modal =
        document.getElementById(
            "passwordModal"
        );

    if (!modal) {
        return;
    }

    const form =
        document.getElementById(
            "passwordForm"
        );

    const errorBox =
        document.getElementById(
            "passwordError"
        );

    if (form) {
        form.reset();
    }

    if (errorBox) {

        errorBox.textContent =
            "";

        errorBox.style.display =
            "none";
    }

    modal.classList.add(
        "open"
    );

    const currentPassword =
        document.getElementById(
            "currentPassword"
        );

    if (currentPassword) {

        setTimeout(
            () => {

                currentPassword.focus();

            },
            100
        );
    }
}

// ============================================================
// FERMER MODALE MOT DE PASSE
// ============================================================

function closePasswordModal() {

    const modal =
        document.getElementById(
            "passwordModal"
        );

    if (modal) {

        modal.classList.remove(
            "open"
        );
    }
}

// ============================================================
// MODIFICATION DU MOT DE PASSE
// ============================================================

async function changePassword(event) {

    event.preventDefault();

    const user =
        getCurrentUser();

    if (!user) {

        showToast(
            "Session utilisateur introuvable."
        );

        return;
    }

    const currentPasswordInput =
        document.getElementById(
            "currentPassword"
        );

    const newPasswordInput =
        document.getElementById(
            "newPassword"
        );

    const confirmPasswordInput =
        document.getElementById(
            "confirmPassword"
        );

    const currentPassword =
        currentPasswordInput
            ? currentPasswordInput.value
            : "";

    const newPassword =
        newPasswordInput
            ? newPasswordInput.value
            : "";

    const confirmPassword =
        confirmPasswordInput
            ? confirmPasswordInput.value
            : "";

    const saveButton =
        document.getElementById(
            "savePasswordButton"
        );

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
    ) {

        showPasswordError(
            "Veuillez remplir tous les champs."
        );

        return;
    }

    if (
        newPassword.length < 6
    ) {

        showPasswordError(
            "Le nouveau mot de passe doit contenir au moins 6 caractères."
        );

        return;
    }

    if (
        newPassword !==
        confirmPassword
    ) {

        showPasswordError(
            "La confirmation du nouveau mot de passe ne correspond pas."
        );

        return;
    }

    if (
        currentPassword ===
        newPassword
    ) {

        showPasswordError(
            "Le nouveau mot de passe doit être différent de l'ancien."
        );

        return;
    }

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Modification...";
    }

    try {

        const payload = {
            user_id: user.id,
            current_password:
                currentPassword,
            new_password:
                newPassword
        };

        console.log(
            "🔐 Demande de modification du mot de passe pour user_id :",
            user.id
        );

        const data =
            await api(
                "/api/change-password",
                {
                    method: "PUT",
                    body: JSON.stringify(
                        payload
                    )
                }
            );

        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Impossible de modifier le mot de passe."
            );
        }

        closePasswordModal();

        showToast(
            "Mot de passe modifié avec succès."
        );

        console.log(
            "✅ Mot de passe modifié avec succès."
        );

    } catch (error) {

        console.error(
            "❌ Erreur modification mot de passe :",
            error
        );

        showPasswordError(
            error.message ||
            "Erreur lors de la modification du mot de passe."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Modifier le mot de passe";
        }
    }
}

// ============================================================
// AFFICHAGE ERREUR MOT DE PASSE
// ============================================================

function showPasswordError(message) {

    const errorBox =
        document.getElementById(
            "passwordError"
        );

    if (!errorBox) {

        showToast(
            message
        );

        return;
    }

    errorBox.textContent =
        message;

    errorBox.style.display =
        "block";
}

// ============================================================
// BOUTONS PROFIL
// ============================================================

function setupProfileButtons() {

    const editButton =
        document.getElementById(
            "editProfileButton"
        );

    const cancelButton =
        document.getElementById(
            "cancelProfileEdit"
        );

    const profileForm =
        document.getElementById(
            "profileForm"
        );

    if (editButton) {

        editButton.addEventListener(
            "click",
            openProfileModal
        );
    }

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeProfileModal
        );
    }

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            saveProfile
        );
    }

    const modal =
        document.getElementById(
            "profileModal"
        );

    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    closeProfileModal();
                }
            }
        );
    }
}

// ============================================================
// BOUTON MOT DE PASSE
// ============================================================

function setupPasswordButton() {

    const button =
        document.getElementById(
            "changePasswordButton"
        );

    if (!button) {

        console.warn(
            "⚠️ Bouton changePasswordButton introuvable."
        );

        return;
    }

    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openPasswordModal();
        }
    );

    console.log(
        "🔐 Bouton modification mot de passe prêt."
    );
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const menuButtons =
        $$(".nav-item");

    const pageTitle =
        document.getElementById(
            "pageTitle"
        );

    const titles = {

        dashboard:
            "Tableau de bord",

        alerts:
            "Alertes",

        sites:
            "Sites",

        measurements:
            "Historique",

        profile:
            "Mon profil",

        settings:
            "Paramètres"
    };

    menuButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const page =
                        button.dataset.page;

                    if (!page) {
                        return;
                    }

                    // ====================================================
                    // MENU ACTIF
                    // ====================================================

                    menuButtons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );
                        }
                    );

                    button.classList.add(
                        "active"
                    );

                    // ====================================================
                    // PAGES
                    // ====================================================

                    $$(".page").forEach(
                        section => {

                            section.classList.remove(
                                "active"
                            );
                        }
                    );

                    const targetPage =
                        document.getElementById(
                            `page-${page}`
                        );

                    if (targetPage) {

                        targetPage.classList.add(
                            "active"
                        );
                    }

                    // ====================================================
                    // TITRE
                    // ====================================================

                    if (pageTitle) {

                        pageTitle.textContent =
                            titles[page] ||
                            "Administration";
                    }

                    // ====================================================
                    // CHARGEMENT DES DONNÉES
                    // ====================================================

                    if (
                        page === "alerts"
                    ) {

                        loadAlerts();
                    }

                    if (
                        page === "sites"
                    ) {

                        loadSites();
                    }

                    if (
                        page === "measurements"
                    ) {

                        loadMeasurements();
                    }

                    if (
                        page === "profile"
                    ) {

                        loadProfile();
                    }

                    // ====================================================
                    // FERMER SIDEBAR MOBILE
                    // ====================================================

                    const sidebar =
                        document.getElementById(
                            "sidebar"
                        );

                    if (sidebar) {

                        sidebar.classList.remove(
                            "open"
                        );
                    }
                }
            );
        }
    );
}

// ============================================================
// ACTUALISATION MANUELLE
// ============================================================

function setupRefreshButton() {

    const refreshButton =
        document.getElementById(
            "refreshButton"
        );

    if (!refreshButton) {
        return;
    }

    refreshButton.addEventListener(
        "click",
        async () => {

            const originalText =
                refreshButton.textContent;

            refreshButton.disabled =
                true;

            refreshButton.textContent =
                "Actualisation...";

            try {

                await refreshAdminDashboard();

                showToast(
                    "Tableau de bord actualisé."
                );

            } catch (error) {

                console.error(
                    "❌ Erreur actualisation :",
                    error
                );

                showToast(
                    "Erreur lors de l'actualisation."
                );

            } finally {

                refreshButton.disabled =
                    false;

                refreshButton.textContent =
                    originalText ||
                    "🔄 Actualiser";
            }
        }
    );
}

// ============================================================
// DÉCONNEXION
// ============================================================

function setupLogoutButton() {

    const logoutButtons =
        $$("#logoutButton, #adminLogout, .logout-button");

    logoutButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logout();
                }
            );
        }
    );
}

// ============================================================
// MENU MOBILE
// ============================================================

function setupMobileMenu() {

    const menuButton =
        document.getElementById(
            "menuButton"
        );

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    if (
        !menuButton ||
        !sidebar
    ) {
        return;
    }

    menuButton.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );
        }
    );
}

// ============================================================
// PARAMÈTRES : NOTIFICATIONS
// ============================================================

function setupNotificationSetting() {

    const setting =
        document.getElementById(
            "notificationsSetting"
        );

    if (!setting) {
        return;
    }

    const saved =
        localStorage.getItem(
            "firewatch_notifications"
        );

    if (saved !== null) {

        setting.checked =
            saved === "true";
    }

    setting.addEventListener(
        "change",
        () => {

            localStorage.setItem(
                "firewatch_notifications",
                setting.checked
            );

            showToast(
                setting.checked
                    ? "Notifications activées."
                    : "Notifications désactivées."
            );
        }
    );
}

// ============================================================
// PARAMÈTRES : ACTUALISATION AUTOMATIQUE
// ============================================================

function setupAutoRefreshSetting() {

    const setting =
        document.getElementById(
            "autoRefreshSetting"
        );

    if (!setting) {
        return;
    }

    const saved =
        localStorage.getItem(
            "firewatch_auto_refresh"
        );

    if (saved !== null) {

        setting.checked =
            saved === "true";
    }

    setting.addEventListener(
        "change",
        () => {

            localStorage.setItem(
                "firewatch_auto_refresh",
                setting.checked
            );

            configureAutoRefresh();

            showToast(
                setting.checked
                    ? "Actualisation automatique activée."
                    : "Actualisation automatique désactivée."
            );
        }
    );
}

// ============================================================
// PARAMÈTRES : INTERVALLE
// ============================================================

function setupRefreshIntervalSetting() {

    const setting =
        document.getElementById(
            "refreshIntervalSetting"
        );

    if (!setting) {
        return;
    }

    const saved =
        localStorage.getItem(
            "firewatch_refresh_interval"
        );

    if (saved !== null) {

        const validValues = [
            "5000",
            "10000",
            "30000",
            "60000"
        ];

        if (
            validValues.includes(
                saved
            )
        ) {

            setting.value =
                saved;
        }
    }

    setting.addEventListener(
        "change",
        () => {

            localStorage.setItem(
                "firewatch_refresh_interval",
                setting.value
            );

            configureAutoRefresh();

            showToast(
                "Intervalle d'actualisation enregistré."
            );
        }
    );
}

// ============================================================
// PARAMÈTRES : MODE SOMBRE
// ============================================================

function setupDarkModeSetting() {

    const setting =
        document.getElementById(
            "darkModeSetting"
        );

    if (!setting) {
        return;
    }

    const saved =
        localStorage.getItem(
            "firewatch_dark_mode"
        );

    if (saved !== null) {

        setting.checked =
            saved === "true";
    }

    setting.addEventListener(
        "change",
        () => {

            localStorage.setItem(
                "firewatch_dark_mode",
                setting.checked
            );

            showToast(
                setting.checked
                    ? "Mode sombre activé."
                    : "Mode sombre désactivé."
            );
        }
    );
}

// ============================================================
// ARRÊTER L'ACTUALISATION AUTOMATIQUE
// ============================================================

function stopAutoRefresh() {

    if (
        autoRefreshTimer !== null
    ) {

        clearInterval(
            autoRefreshTimer
        );

        autoRefreshTimer =
            null;
    }
}

// ============================================================
// ACTUALISATION AUTOMATIQUE
// ============================================================

function configureAutoRefresh() {

    stopAutoRefresh();

    const setting =
        document.getElementById(
            "autoRefreshSetting"
        );

    if (!setting) {
        return;
    }

    if (!setting.checked) {

        console.log(
            "⏸️ Actualisation automatique désactivée."
        );

        return;
    }

    const intervalSetting =
        document.getElementById(
            "refreshIntervalSetting"
        );

    const interval =
        intervalSetting
            ? Number(
                intervalSetting.value
            )
            : 10000;

    console.log(
        `🔄 Actualisation automatique toutes les ${interval / 1000} secondes.`
    );

    autoRefreshTimer =
        setInterval(
            async () => {

                console.log(
                    "🔄 Actualisation automatique..."
                );

                await Promise.allSettled([

                    loadAdminStats(),

                    loadDashboard(),

                    loadAlerts(),

                    loadSites()

                ]);

            },
            interval
        );
}

// ============================================================
// ACTUALISATION COMPLÈTE
// ============================================================

async function refreshAdminDashboard() {

    console.log(
        "🔄 Actualisation du tableau de bord..."
    );

    await Promise.allSettled([

        loadAdminStats(),

        loadDashboard(),

        loadMeasurements(),

        loadAlerts(),

        loadSites(),

        loadProfile()

    ]);

    console.log(
        "✅ Actualisation terminée."
    );
}

// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "--";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            dateValue
        );
    }

    return date.toLocaleString(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🔥 FIREWATCH - Administration"
        );

        console.log(
            "🌐 API Flask :",
            API_BASE_URL
        );

        // ====================================================
        // VÉRIFICATION SESSION
        // ====================================================

        if (!checkAdminAccess()) {
            return;
        }

        // ====================================================
        // AFFICHAGE UTILISATEUR
        // ====================================================

        displayCurrentUser();

        // ====================================================
        // NAVIGATION
        // ====================================================

        setupNavigation();

        // ====================================================
        // BOUTON ACTUALISER
        // ====================================================

        setupRefreshButton();

        // ====================================================
        // DÉCONNEXION
        // ====================================================

        setupLogoutButton();

        // ====================================================
        // MENU MOBILE
        // ====================================================

        setupMobileMenu();

        // ====================================================
        // PROFIL
        // ====================================================

        setupProfileButtons();

        setupPasswordButton();

        // ====================================================
        // ALERTES — BOUTON RÉSOUDRE
        // ====================================================

        setupAlertActions();

        // ====================================================
        // PARAMÈTRES
        // ====================================================

        setupNotificationSetting();

        setupAutoRefreshSetting();

        setupRefreshIntervalSetting();

        setupDarkModeSetting();

        // ====================================================
        // CHARGEMENT INITIAL
        // ====================================================

        await refreshAdminDashboard();

        // ====================================================
        // ACTUALISATION AUTOMATIQUE
        // ====================================================

        configureAutoRefresh();

        console.log(
            "✅ Interface administrateur prête."
        );
    }
);