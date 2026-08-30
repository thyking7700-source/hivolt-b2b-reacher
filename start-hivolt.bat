@echo off
cd /d "%~dp0"
echo.
echo  HIVOLT B2B REACHER
echo  First screen is ACCESS TOKEN login.
echo  After Vite starts, press o then Enter to open the browser.
echo.
node ".\node_modules\vite\bin\vite.js" dev --host 0.0.0.0 --port 80
pause
