@echo off
echo ========================================
echo Adding Campaign Name to Meta Leads
echo ========================================
echo.

cd /d "%~dp0"

echo Running migration...
node apply-campaign-name-migration.js

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your backend server
echo 2. Go to Lead Center and click "Sync Leads"
echo 3. Campaign names will now appear in the dropdown
echo.
pause
