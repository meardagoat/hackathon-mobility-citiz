@echo off
echo ========================================
echo Commit des fichiers pour l'equipe backend
echo ========================================

cd /d C:\Users\prosp\Desktop\hackathon_mobility_frontend

echo.
echo Ajout des fichiers...

REM Documentation backend
git add API_CONTRACT_VALIDATION.md
git add API_SPECIFICATION.md
git add BACKEND_REQUIREMENTS.md
git add GEOJSON_COMPATIBILITY.md
git add MESSAGE_POUR_BACKEND.md
git add CONTEXTE_BORDEAUX.md

REM Documentation equipe
git add AVANCEMENT_FRONTEND.md
git add MESSAGE_EQUIPE.txt
git add README.md

REM Code source
git add types\api.ts
git add lib\api.ts
git add lib\constants.ts
git add .env.example
git add .gitignore

echo.
echo Création du commit...
git commit -m "docs: documentation complete pour integration backend - Adaptation Bordeaux - Types et services API - Documentation equipe"

echo.
echo ========================================
echo Commit termine !
echo ========================================
echo.
echo Pour push vers le repository distant:
echo   git push origin main
echo.
pause
