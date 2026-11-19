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

if not exist ".env" (
  echo Copiando .env.example para .env...
  copy ".env.example" ".env" >nul
)

if not exist "node_modules" (
  echo Instalando dependencias Node...
  call npm install || goto :erro
)

echo [1/5] Subindo PostgreSQL no Docker...
docker compose up -d postgres || goto :erro

echo [2/5] Aguardando PostgreSQL ficar pronto...
set /a tries=0
:wait_pg
docker compose exec -T postgres pg_isready -U postgres -d hojebelem >nul 2>&1
if not errorlevel 1 goto :pg_ok
set /a tries+=1
if %tries% geq 30 (
  echo [ERRO] PostgreSQL demorou demais para iniciar.
  goto :erro
)
ping -n 3 127.0.0.1 >nul
goto :wait_pg

:pg_ok
echo [3/5] Aplicando migrations e gerando Prisma Client...
call npx prisma migrate deploy || goto :erro
call npx prisma generate || goto :erro

echo [4/5] Rodando seed inicial...
call npm run db:seed || goto :erro

echo [5/5] Aplicando permissoes do coletor (collector/db-role.sql)...
docker compose exec -T postgres psql -U postgres -d hojebelem < "collector\db-role.sql" || goto :erro

echo.
echo [OK] Banco pronto!
exit /b 0

:erro
echo.
echo [FALHA] Nao foi possivel preparar o banco.
pause
exit /b 1
