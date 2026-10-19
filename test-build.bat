@echo off
echo === Testing npm build ===
cd /d "c:\Users\prosp\Desktop\hackathon_mobility_frontend"
call npm run build
echo.
echo Build complete. Exit code: %ERRORLEVEL%
pause
