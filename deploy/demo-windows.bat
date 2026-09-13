@echo off
setlocal
title Pouya CRM and Loyalty Club Demo

where node.exe >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Node.js was not found on this laptop.
  echo Download and install the LTS version from:
  echo https://nodejs.org/en/download
  echo Restart Windows after installation, then run this file again.
  echo.
  pause
  exit /b 1
)

echo Starting Pouya CRM and Loyalty Club Demo...
node "%~dp0demo-server.cjs"

if errorlevel 1 (
  echo.
  echo ERROR: The demo could not start. Please take a screenshot of this window.
  echo.
  pause
)

endlocal
