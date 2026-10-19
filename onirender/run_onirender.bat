@echo off
setlocal

cd /d "%~dp0"

if not exist "package.json" (
  echo [OniRender] ERROR: package.json not found in this folder.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [OniRender] ERROR: npm.cmd was not found. Please install Node.js.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [OniRender] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [OniRender] ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo [OniRender] Starting app...
call npm.cmd run start

if errorlevel 1 (
  echo [OniRender] App exited with an error.
  pause
  exit /b 1
)

exit /b 0
