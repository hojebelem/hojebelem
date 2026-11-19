# Scripts Windows (`windowscripts`)

Atalhos `.cmd` para subir o projeto Hoje Belém localmente no Windows (Docker + PostgreSQL + Prisma + Next.js).

## Scripts disponíveis

| Script | O que faz | Arquivos/serviços que inicia ou usa |
|---|---|---|
| `iniciar-tudo.cmd` | **Atalho principal (1 clique).** Executa `01-iniciar-banco.cmd` e depois `02-iniciar-site.cmd`. | Todos abaixo, em ordem. |
| `01-iniciar-banco.cmd` | Garante `.env` e `node_modules`, sobe o PostgreSQL no Docker, aguarda `pg_isready`, roda migrations, gera Prisma Client, executa o seed e aplica as permissões do coletor. | `.env` (ou `.env.example`), `docker-compose.yml` (serviço `postgres`), `prisma/migrations/`, `prisma/seed.ts`, `collector/db-role.sql`. |
| `02-iniciar-site.cmd` | Sobe o servidor Next.js (`npm run dev`), aguarda `http://localhost:3000/api/health` responder `200` e abre `http://localhost:3000` automaticamente no navegador padrão. | `package.json` (`dev`), `src/app/api/health/route.ts`. |
| `03-limitar-banco.cmd` | Limita ao vivo o container `postgres` do Docker a **1 CPU core** e **512 MB de RAM** (`--memory-swap=512m`), sem reiniciar nem apagar dados. | Container `postgres` do `docker-compose.yml` (`docker update`). |
| `04-reverter-banco.cmd` | Reverte os limites de CPU e memória do container `postgres` para o padrão do Docker (`docker compose up -d --force-recreate postgres`, mantendo os dados do volume `postgres_data`). | `docker-compose.yml` (serviço `postgres`). |

## Uso rápido

1. Abra o **Docker Desktop**.
2. Dê dois cliques em `iniciar-tudo.cmd` (ou rode `03-limitar-banco.cmd` depois se quiser economizar RAM/CPU no desenvolvimento local).
3. Para parar o servidor Next.js, pressione `Ctrl+C` na janela aberta.
4. Para testar `/admin`, use o usuário criado pelo seed (`prisma/seed.ts`): `admin@hojebelem.local` / `MudeEstaSenha123!`.

## Notas sobre o limite (`512 MB` / `1 CPU`)

- Para desenvolvimento local (dezenas/centenas de eventos), **1 core e 512 MB** são suficientes — o `postgres:16-alpine` costuma consumir ~30–120 MB em uso leve.
- Os limites aplicados por `03-limitar-banco.cmd` não alteram `docker-compose.yml` nem afetam produção.
