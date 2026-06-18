@echo off
REM ===========================================================================
REM  Push Safe Learning Spot Centre to GitHub
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
echo === Preparing repository ===
if not exist ".git" git init
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
echo === Pushing to GitHub (sign in if a window appears) ===
git push -u origin main

echo.
echo ===========================================================================
echo  DONE.
echo.
echo  If a sign-in window appeared, finish it in your browser, then it pushes.
echo.
echo  If you see "rejected" or "fetch first" (happens if you created the repo
echo  WITH a README), run this once in a terminal here:
echo        git pull origin main --rebase
echo  then double-click this file again.
echo ===========================================================================
echo.
pause
