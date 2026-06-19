@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ============================================================
echo   Push with HTTP/1.1 (fixes most "HTTP 408 / sideband" errors)
echo ============================================================
echo.
echo === Applying connection fixes ===
git config http.version HTTP/1.1
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
echo === Push attempt !n! of 3 (HTTP/1.1) ===
git push -u origin main --force
if not errorlevel 1 goto ok
if !n! GEQ 3 goto checked
echo.
echo Hiccup again. Waiting 5s, then retrying...
timeout /t 5 /nobreak >nul
echo.
goto retry

:ok
echo.
echo *** Push command reported SUCCESS ***
goto checked

:checked
echo.
echo ============================================================
echo   VERIFY: these two long codes should now MATCH
echo ============================================================
echo --- Local HEAD ---
git rev-parse HEAD
echo --- GitHub main ---
git ls-remote https://github.com/hughmupfigo-star/SAFE-Learning-Spot.git main
echo.
pause
