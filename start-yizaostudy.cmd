@echo off
setlocal EnableExtensions
title Yizao Study Planner
cd /d "%~dp0"

set "WRITE_CHECK_FILE=%~dp0.__write_check.tmp"
copy /y NUL "%WRITE_CHECK_FILE%" >nul 2>nul
if errorlevel 1 (
  echo This folder is not writable, so the planner cannot save startup logs or study progress.
  echo Please move the whole yizaostudy folder to Desktop or Documents, then run start-yizaostudy.cmd again.
  echo Do not run this file directly inside the zip archive or from a protected system folder.
  echo.
  pause
  exit /b 1
)
del "%WRITE_CHECK_FILE%" >nul 2>nul

set "LOG_FILE=%~dp0startup.log"
echo [%date% %time%] Starting yizaostudy > "%LOG_FILE%"

echo Yizao Study Planner
echo Current folder: %CD%
echo Log file: %LOG_FILE%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Please install Node.js LTS from https://nodejs.org/ and run this file again.
  echo Node.js was not found. >> "%LOG_FILE%"
  echo.
  pause
  exit /b 1
)

node -e "const major=Number(process.versions.node.split('.')[0]); process.exit(major>=20?0:1)" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  echo Node.js is installed, but the version is too old.
  echo Please install Node.js LTS 20 or newer from https://nodejs.org/.
  node -v
  node -v >> "%LOG_FILE%" 2>&1
  echo.
  pause
  exit /b 1
)

echo Starting local server...
echo If the browser does not open automatically, visit:
echo http://127.0.0.1:4173
echo.
echo Keep this window open while studying. Close this window to stop the planner.
echo.

node server.js >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo The planner stopped unexpectedly. Exit code: %EXIT_CODE%
echo.
echo Last startup log:
type "%LOG_FILE%"
echo.
pause
exit /b %EXIT_CODE%
