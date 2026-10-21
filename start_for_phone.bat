@echo off
chcp 65001 >nul
title FireWatch - acces telephone
cd /d "%~dp0"

REM --- 1. Lancer Flask s'il ne tourne pas deja (port 5000) ---
netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul
if errorlevel 1 (
    echo Demarrage de Flask dans une autre fenetre...
    start "Flask" cmd /k "Backend_nodeRed\start_flask.bat"
    timeout /t 5 /nobreak >nul
) else (
    echo Flask tourne deja.
)

REM --- 2. Choisir Python (celui du .venv si present) ---
set "PY=python"
if exist "Backend_nodeRed\.venv\Scripts\python.exe" set "PY=Backend_nodeRed\.venv\Scripts\python.exe"

REM --- 3. Servir le frontend pour le telephone ---
"%PY%" serve_phone.py
pause
