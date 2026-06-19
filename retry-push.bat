@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ============================================================
echo   Retry push to GitHub (robust against slow connections)
echo ============================================================
echo.

echo === Tuning git for large / slow uploads ===
git config http.postBuffer 524288000
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999
echo Done.
echo.

git remote remove origin 1>nul 2>nul
git remote add origin https://github.com/hughmupfigo-star/SAFE-Learning-Spot.git

set /a n=0
:retry
set /a n+=1
echo === Push attempt !n! of 5 ===
git push -u origin main --force
if not errorlevel 1 goto ok
if !n! GEQ 5 goto fail
echo.
echo Connection hiccup (timeout). Waiting 5s, then retrying...
timeout /t 5 /nobreak >nul
echo.
goto retry

:ok
echo.
echo ============================================================
echo   SUCCESS - GitHub now matches your folder.
echo   Refresh: https://github.com/hughmupfigo-star/SAFE-Learning-Spot
echo ============================================================
goto end

:fail
echo.
echo ============================================================
echo   Still timing out after 5 tries - your connection dropped
echo   the upload. Wait a bit and just double-click this file again.
echo ============================================================

:end
echo.
pause
