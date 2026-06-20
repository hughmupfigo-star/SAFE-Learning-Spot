@echo off
echo.
echo === Running push-to-github.ps1 ===
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0push-to-github.ps1"
