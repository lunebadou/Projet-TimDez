@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\activate.bat (
  echo Lance d'abord installer.bat
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
start "MQTT listener" cmd /k python -u python\mqtt_listener.py
start "Site web" /D "%~dp0..\frontend" cmd /k python -m http.server 8080
timeout /t 3 >nul
start "" http://localhost:8080
python app.py
pause
