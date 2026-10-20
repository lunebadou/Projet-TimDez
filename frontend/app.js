/* =========================================================
   FIREWATCH - AUTHENTIFICATION
   Connexion + Inscription
========================================================= */

const API = "http://127.0.0.1:5000";

/* =========================================================
   UTILITAIRES
========================================================= */

const $ = selector => document.querySelector(selector);

function showToast(message) {
    const toast = $("#toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* =========================================================
   REQUÊTE API
========================================================= */

async function api(endpoint, options = {}) {

    const response = await fetch(
        API + endpoint,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        data = {
            message: "Réponse invalide du serveur"
        };
    }

    if (!response.ok) {
        throw new Error(
            data.message || "Une erreur est survenue"
        );
    }

    return data;
}

/* =========================================================
   REDIRECTION SELON LE RÔLE
========================================================= */

function redirectUser(user) {

    console.log("Utilisateur connecté :", user);

    // Sauvegarde de la session
    localStorage.setItem(
        "firewatch_user",
        JSON.stringify(user)
    );

    /* -----------------------------------------------------
       ADMINISTRATEUR
    ----------------------------------------------------- */

    if (user.role === "admin") {

        window.location.href = "admin.html";

        return;
    }

    /* -----------------------------------------------------
       CLIENT / UTILISATEUR
    ----------------------------------------------------- */

    if (user.role === "client") {

        window.location.href = "client.html";

        return;
    }

    /* -----------------------------------------------------
       MAINTENANCE
    ----------------------------------------------------- */

    if (user.role === "maintenance") {

        // Pour le moment on utilise le dashboard client
        window.location.href = "client.html";

        return;
    }

    showToast("Rôle utilisateur inconnu");
}

/* =========================================================
   CONNEXION
========================================================= */

async function login() {

    const emailInput =
        $("#loginEmail") ||
        $("#email");

    const passwordInput =
        $("#loginPassword") ||
        $("#password");

    if (!emailInput || !passwordInput) {

        console.error(
            "Champs de connexion introuvables."
        );

        return;
    }

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (!email) {

        showToast(
            "Veuillez saisir votre adresse email."
        );

        emailInput.focus();

        return;
    }

    if (!password) {

        showToast(
            "Veuillez saisir votre mot de passe."
        );

        passwordInput.focus();

        return;
    }

    /* -----------------------------------------------------
       BOUTON
    ----------------------------------------------------- */

    const loginButton =
        $("#loginButton") ||
        $("button[type='submit']");

    const originalText =
        loginButton
            ? loginButton.textContent
            : "";

    if (loginButton) {

        loginButton.disabled = true;
        loginButton.textContent =
            "Connexion...";
    }

    try {

        console.log(
            "🔐 Tentative de connexion..."
        );

        const data = await api(
            "/api/login",
            {
                method: "POST",

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        console.log(
            "✅ Connexion réussie :",
            data
        );

        if (!data.success || !data.user) {

            throw new Error(
                data.message ||
                "Connexion impossible"
            );
        }

        showToast(
            "Connexion réussie !"
        );

        /* -------------------------------------------------
           REDIRECTION
        ------------------------------------------------- */

        setTimeout(() => {

            redirectUser(data.user);

        }, 500);

    }

    catch (error) {

        console.error(
            "❌ Erreur de connexion :",
            error
        );

        showToast(
            error.message ||
            "Email ou mot de passe incorrect."
        );

    }

    finally {

        if (loginButton) {

            loginButton.disabled = false;
            loginButton.textContent =
                originalText || "Se connecter";

        }

    }
}

/* =========================================================
   INSCRIPTION
========================================================= */

async function register() {

    const nameInput =
        $("#registerName") ||
        $("#name");

    const emailInput =
        $("#registerEmail");

    const passwordInput =
        $("#registerPassword");

    const confirmInput =
        $("#registerPasswordConfirm") ||
        $("#confirmPassword");

    if (
        !nameInput ||
        !emailInput ||
        !passwordInput
    ) {

        console.error(
            "Champs d'inscription introuvables."
        );

        return;
    }

    const name =
        nameInput.value.trim();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmInput
            ? confirmInput.value
            : password;

    /* -----------------------------------------------------
       VALIDATIONS
    ----------------------------------------------------- */

    if (!name) {

        showToast(
            "Veuillez saisir votre nom."
        );

        nameInput.focus();

        return;
    }

    if (!email) {

        showToast(
            "Veuillez saisir votre email."
        );

        emailInput.focus();

        return;
    }

    if (!password) {

        showToast(
            "Veuillez saisir un mot de passe."
        );

        passwordInput.focus();

        return;
    }

    if (password.length < 6) {

        showToast(
            "Le mot de passe doit contenir au moins 6 caractères."
        );

        passwordInput.focus();

        return;
    }

    if (password !== confirmPassword) {

        showToast(
            "Les mots de passe ne correspondent pas."
        );

        if (confirmInput) {
            confirmInput.focus();
        }

        return;
    }

    /* -----------------------------------------------------
       BOUTON INSCRIPTION
    ----------------------------------------------------- */

    const registerButton =
        $("#registerButton");

    const originalText =
        registerButton
            ? registerButton.textContent
            : "";

    if (registerButton) {

        registerButton.disabled = true;

        registerButton.textContent =
            "Inscription...";
    }

    try {

        console.log(
            "📝 Création du compte..."
        );

        const data = await api(
            "/api/register",
            {
                method: "POST",

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            }
        );

        console.log(
            "✅ Inscription réussie :",
            data
        );

        if (!data.success) {

            throw new Error(
                data.message ||
                "Inscription impossible"
            );
        }

        showToast(
            "Compte créé avec succès !"
        );

        /* -------------------------------------------------
           NETTOYAGE DU FORMULAIRE
        ------------------------------------------------- */

        nameInput.value = "";
        emailInput.value = "";
        passwordInput.value = "";

        if (confirmInput) {
            confirmInput.value = "";
        }

        /* -------------------------------------------------
           RETOUR À LA CONNEXION
        ------------------------------------------------- */

        setTimeout(() => {

            showLoginForm();

        }, 800);

    }

    catch (error) {

        console.error(
            "❌ Erreur inscription :",
            error
        );

        showToast(
            error.message ||
            "Impossible de créer le compte."
        );

    }

    finally {

        if (registerButton) {

            registerButton.disabled = false;

            registerButton.textContent =
                originalText || "S'inscrire";

        }

    }
}

/* =========================================================
   AFFICHER LE FORMULAIRE LOGIN
========================================================= */

function showLoginForm() {

    const loginForm =
        $("#loginForm");

    const registerForm =
        $("#registerForm");

    if (registerForm) {

        registerForm.style.display =
            "none";
    }

    if (loginForm) {

        loginForm.style.display =
            "block";
    }

    console.log(
        "🔐 Formulaire connexion affiché"
    );
}

/* =========================================================
   AFFICHER LE FORMULAIRE INSCRIPTION
========================================================= */

function showRegisterForm() {

    const loginForm =
        $("#loginForm");

    const registerForm =
        $("#registerForm");

    if (loginForm) {

        loginForm.style.display =
            "none";
    }

    if (registerForm) {

        registerForm.style.display =
            "block";
    }

    console.log(
        "📝 Formulaire inscription affiché"
    );
}

/* =========================================================
   DÉCONNEXION
========================================================= */

function logout() {

    localStorage.removeItem(
        "firewatch_user"
    );

    window.location.href =
        "index.html";
}

/* =========================================================
   UTILISATEUR CONNECTÉ
========================================================= */

function getCurrentUser() {

    const user =
        localStorage.getItem(
            "firewatch_user"
        );

    if (!user) {
        return null;
    }

    try {

        return JSON.parse(user);

    } catch {

        localStorage.removeItem(
            "firewatch_user"
        );

        return null;
    }
}

/* =========================================================
   ÉVÉNEMENTS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🔥 FIREWATCH - Authentification"
        );

        console.log(
            "🌐 API Flask :",
            API
        );

        /* -------------------------------------------------
           FORMULAIRE LOGIN
        ------------------------------------------------- */

        const loginForm =
            $("#loginForm");

        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    login();

                }
            );

        }

        /* -------------------------------------------------
           FORMULAIRE INSCRIPTION
        ------------------------------------------------- */

        const registerForm =
            $("#registerForm");

        if (registerForm) {

            registerForm.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    register();

                }
            );

        }

        /* -------------------------------------------------
           BOUTON VERS INSCRIPTION
        ------------------------------------------------- */

        const showRegisterButton =
            $("#showRegister");

        if (showRegisterButton) {

            showRegisterButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showRegisterForm();

                }
            );

        }

        /* -------------------------------------------------
           BOUTON RETOUR LOGIN
        ------------------------------------------------- */

        const showLoginButton =
            $("#showLogin");

        if (showLoginButton) {

            showLoginButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showLoginForm();

                }
            );

        }

    }
);