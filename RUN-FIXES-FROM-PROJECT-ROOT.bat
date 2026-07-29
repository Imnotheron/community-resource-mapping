@echo off
setlocal

set "PROJECT_ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass ^
  -File "%~dp0Apply-CRMS-Lint-Fixes.ps1" ^
  -ProjectRoot "%PROJECT_ROOT%"

pause