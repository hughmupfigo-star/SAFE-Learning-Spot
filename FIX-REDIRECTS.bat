@echo off
echo.
echo === Removing _redirects from GitHub (fixes login.html ERR_FAILED) ===
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-redirects.ps1"
