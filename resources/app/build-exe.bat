@echo off
rem Build installer. Node.js 18+ required.
call npm install
call npm run dist
echo.
echo Done. The installer is in the dist folder.
pause