@echo off
chcp 65001 >nul
setlocal

call "%~dp001-iniciar-banco.cmd"
if errorlevel 1 exit /b 1

call "%~dp002-iniciar-site.cmd"
