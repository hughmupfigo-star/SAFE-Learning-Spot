@echo off
cd /d "%~dp0"
echo ============================================================
echo   Did the push actually land on GitHub?
echo ============================================================
echo.
echo --- Your local commit (HEAD) ---
git rev-parse HEAD
echo.
echo --- What GitHub currently has on 'main' ---
git ls-remote https://github.com/hughmupfigo-star/SAFE-Learning-Spot.git main
echo.
echo ------------------------------------------------------------
echo If the long code on the GitHub line MATCHES your HEAD code,
echo the push SUCCEEDED - you can ignore the timeout messages.
echo If GitHub shows nothing, it has not landed yet.
echo ------------------------------------------------------------
echo.
pause
