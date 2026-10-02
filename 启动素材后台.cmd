@echo off
cd /d "%~dp0"
node scripts\admin\start.mjs
if errorlevel 1 pause
