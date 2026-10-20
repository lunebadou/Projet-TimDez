@echo off
cd /d "%~dp0"
echo === Suppression de l'ancien environnement .venv ===
if exist .venv rmdir /s /q .venv
echo === Creation du nouvel environnement ===
python -m venv .venv
if errorlevel 1 goto nopython
call .venv\Scripts\activate.bat
echo === Installation des dependances ===
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 goto piperror
echo.
echo ===== INSTALLATION TERMINEE =====
pause
exit /b 0
:nopython
echo ERREUR : Python est introuvable. Installe Python depuis python.org en cochant "Add python.exe to PATH".
pause
exit /b 1
:piperror
echo ERREUR pendant l'installation des paquets. Fais une capture de cette fenetre.
pause
exit /b 1
