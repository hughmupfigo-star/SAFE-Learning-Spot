@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo   Finishing the push to GitHub
echo   (makes your repo match THIS folder exactly)
echo ============================================================
echo.

echo === Step 1: cancel the interrupted merge/rebase ===
git rebase --abort 1>nul 2>nul
git merge  --abort 1>nul 2>nul
echo Cleaned up.
echo.

echo === Step 2: commit the current folder ===
git add -A
git commit -m "Safe Learning Spot - full site (incl. password reset)" || echo (nothing new to commit - continuing)
git branch -M main
echo.

echo === Step 3: point at your GitHub repo ===
git remote remove origin 1>nul 2>nul
git remote add origin https://github.com/hughmupfigo-star/SAFE-Learning-Spot.git
echo.

echo === Step 4: push (sign in to GitHub if a window appears) ===
git push -u origin main --force
echo.
echo ============================================================
echo   DONE if you see:  branch 'main' set up to track ... main -^> main
echo   Then refresh: https://github.com/hughmupfigo-star/SAFE-Learning-Spot
echo ============================================================
echo.
pause
