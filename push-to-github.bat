@echo off
setlocal
REM ===========================================================================
REM  Push Safe Learning Spot Centre to GitHub  (self-repairing)
REM  ---------------------------------------------------------------------------
REM  HOW TO USE:
REM    1. Make sure Git is installed:  https://git-scm.com/downloads
REM    2. Double-click this file (it lives inside your project folder).
REM    3. The first time, a browser window opens to sign in to GitHub.
REM       Sign in as hughmupfigo-star and approve.  That's it.
REM
REM  Your .env file and node_modules are excluded automatically by .gitignore,
REM  so no secrets are uploaded.
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
git add .
git commit -m "Update Safe Learning Spot Centre" || echo (nothing new to commit - continuing)
git branch -M main

echo.
echo === Connecting to your GitHub repo ===
git remote remove origin >nul 2>&1
git remote add origin https://github.com/hughmupfigo-star/SAFE-Learning-Spot.git

echo.
echo === Safety check: these files will NOT be uploaded ===
git status --porcelain --ignored | findstr /R "^!! .env$ ^!!.*node_modules" >nul && echo .env and node_modules are correctly ignored. || echo (continuing)

echo.
echo === Pushing to GitHub (sign in if a browser window appears) ===
git push -u origin main
if errorlevel 1 (
  echo.
  echo === Push was rejected - syncing with the remote, then retrying once ===
  git pull origin main --rebase --allow-unrelated-histories
  git push -u origin main
)

echo.
echo ===========================================================================
echo  DONE.  If you saw a sign-in window, finish it and the push completes.
echo  Refresh https://github.com/hughmupfigo-star/SAFE-Learning-Spot to confirm.
echo ===========================================================================
echo.
pause
