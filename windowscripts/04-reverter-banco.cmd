@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

docker info >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao esta respondendo. Abra o Docker Desktop e tente de novo.
  pause
  exit /b 1
)

echo Recriando container postgres com limites padrao do Docker (dados mantidos no volume)...
docker compose up -d --force-recreate postgres || goto :erro

set "CID="
for /f "delims=" %%i in ('docker compose ps -q postgres 2^>nul') do set "CID=%%i"
if not "%CID%"=="" (
  docker inspect --format "[OK] Limite revertido -> NanoCpus={{.HostConfig.NanoCpus}} (0 = padrao) | Memory={{.HostConfig.Memory}} (0 = padrao)" "%CID%"
)
exit /b 0

:erro
echo [FALHA] Nao foi possivel reverter os limites do container postgres.
pause
exit /b 1
