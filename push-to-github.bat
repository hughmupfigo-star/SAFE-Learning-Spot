@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM  Push Safe Learning Spot Centre to GitHub  (one-click, self-repairing)
REM  ---------------------------------------------------------------------------
REM  HOW TO USE:
REM    1. Make sure Git is installed:  https://git-scm.com/downloads
REM    2. Double-click this file (it lives inside your project folder).
REM    3. If a GitHub sign-in window appears the first time, complete it.
REM
REM  Your .env file and node_modules are excluded automatically by .gitignore,
REM  so no secrets are uploaded.  This script also applies the HTTP/1.1 +
REM  big-buffer settings that got past the "HTTP 408 / sideband" timeout.
REM ===========================================================================

cd /d "%~dp0"
echo.
echo === Project folder: %CD% ===

REM --- Make sure Git is installed -------------------------------------------
where git >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Git is not installed. Download it from https://git-scm.com/downloads
  echo  then run this file again.
  echo.
  pause
  exit /b 1
)

REM --- Connection fixes for slow / VPN / proxy networks ----------------------
git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999

REM --- Repair a broken / half-initialised repo -------------------------------
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo.
  echo === Existing repo missing or corrupt - resetting it cleanly ===
  if exist ".git" rmdir /s /q ".git"
  git init
)

REM --- Make sure there is a commit identity (only sets one if missing) -------
git config user.email >nul 2>&1 || git config user.email "hughmupfigo-star@users.noreply.github.com"
git config user.name  >nul 2>&1 || git config user.name  "hughmupfigo-star"

echo.
echo === Staging files (secrets excluded by .gitignore) ===
git add -A
git commit -m "Update Safe Learning Spot Centre" || echo (nothing new to commit - continuing)
git branch -M main

echo.
echo === Connecting to your GitHub repo ===
git remote remove origin 1>nul 2>nul
git remote add origin https://github.com/hughmupfigo-star/SAFE-Learning-Spot.git

echo.
echo === Pushing (retries up to 3 times on a timeout) ===
set /a n=0
:retry
set /a n+=1
echo --- Attempt !n! of 3 ---
git push -u origin main
if not errorlevel 1 goto ok
if !n! GEQ 3 goto fail
echo Connection hiccup. Waiting 5s, then retrying...
timeout /t 5 /nobreak >nul
goto retry

:ok
echo.
echo ============================================================
echo   SUCCESS - GitHub now matches this folder.
echo   Refresh: https://github.com/hughmupfigo-star/SAFE-Learning-Spot
echo ============================================================
goto end

:fail
echo.
echo ============================================================
echo   Push kept timing out. This is usually a VPN or antivirus.
echo   Try: turn OFF Hotspot Shield (VPN) for a minute, then run
echo   this file again. Your sign-in and settings are remembered.
echo ============================================================

:end
echo.
pause
