@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\activate.bat (
  echo Lance d'abord installer.bat
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
start "MQTT listener" cmd /k python -u python\mqtt_listener.py
start "Site web" /D "%~dp0..\frontend" cmd /k "python -m http.server 8090 --bind 0.0.0.0 >nul 2>&1"
timeout /t 3 >nul
start "" http://127.0.0.1:8090
python app.py
pause
