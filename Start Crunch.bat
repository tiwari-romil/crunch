@echo off
cd /d "%~dp0"

if exist "%~dp0import-art.bat" call "%~dp0import-art.bat"

set "PS="
if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not defined PS if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "PS=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
if not defined PS if exist "%SystemRoot%\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" set "PS=%SystemRoot%\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
if not defined PS if exist "%ProgramFiles%\PowerShell\7\pwsh.exe" set "PS=%ProgramFiles%\PowerShell\7\pwsh.exe"

if not defined PS (
  echo PowerShell was not found, so phones on the Wi-Fi cannot open the game.
  echo Opening Crunch on this PC instead.
  echo.
  start "" "%~dp0index.html"
  echo Crunch is open in the browser on this computer.
  echo.
  pause
  exit /b 0
)

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-lan.ps1"
echo.
echo Crunch stopped.
pause
