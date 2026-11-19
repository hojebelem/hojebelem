@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

set "CID="
for /f "delims=" %%i in ('docker compose ps -q postgres 2^>nul') do set "CID=%%i"
if "%CID%"=="" (
  echo [ERRO] Container postgres nao encontrado. Rode 01-iniciar-banco.cmd primeiro.
  pause
  exit /b 1
)

echo Aplicando limite no container %CID%: 1 CPU core e 512 MB de RAM...
docker update --cpus=1 --memory=512m --memory-swap=512m "%CID%" || goto :erro

echo.
docker inspect --format "[OK] Limite ativo -> NanoCpus={{.HostConfig.NanoCpus}} (1000000000 = 1 core) | Memory={{.HostConfig.Memory}} bytes" "%CID%"
exit /b 0

:erro
echo [FALHA] Nao foi possivel limitar o container postgres.
pause
exit /b 1
