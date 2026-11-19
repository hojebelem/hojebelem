@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

set "PG_RUNNING="
for /f "delims=" %%i in ('docker compose ps --status running -q postgres 2^>nul') do set "PG_RUNNING=%%i"
if "%PG_RUNNING%"=="" (
  echo [AVISO] Container postgres nao esta rodando. Suba com 01-iniciar-banco.cmd ou iniciar-tudo.cmd.
)

echo Iniciando servidor Next.js em http://localhost:3000 ...
echo O navegador abrira automaticamente quando o site estiver pronto.
echo (Pressione Ctrl+C para parar o servidor.)
echo.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 60;$i++){try{$r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 10;if($r.StatusCode -eq 200){Start-Process 'http://localhost:3000';break}}catch{};Start-Sleep -Seconds 1}"

call npm run dev
