# Hoje Belém

Plataforma mobile-first para descoberta e divulgação de eventos em Belém/PA.

## Desenvolvimento

1. Copie `.env.example` para `.env`.
2. Rode `docker compose up -d postgres`.
3. Rode `npm install`, `npx prisma migrate dev` e `npm run db:seed`.
4. Inicie com `npm run dev` e acesse `http://localhost:3000`.

O seed cria o administrador `admin@hojebelem.local` com a senha temporária `MudeEstaSenha123!`. Troque-a fora do ambiente local. O painel fica em `/admin` (link "Painel admin" no Perfil).

Para subir app e banco juntos: `docker compose up --build`.

### Quando o `schema.prisma` mudar (Windows)

O `npm run dev` trava o arquivo do Prisma no Windows. Para aplicar mudanças no banco:

1. Pare o `npm run dev` (`Ctrl+C`).
2. Rode `npx prisma migrate dev` (aplica as migrations novas).
3. Rode `npx prisma generate`.
4. Suba de novo com `npm run dev`.

Se pular isso, as páginas quebram com erros como `Unknown argument` ou `EPERM`.

## Coletor da Sympla

Traz eventos de Belém da Sympla para a fila **Pendentes de revisão** do admin. Detalhes em [`collector/README.md`](collector/README.md).

- Antes da primeira coleta, crie o usuário restrito do coletor no banco (depois das migrations): `docker compose exec -T postgres psql -U postgres -d hojebelem < collector/db-role.sql`. Ele só lê cidade, categorias e o papel dos usuários e só grava eventos; não lê senhas nem apaga nada.
- Rodar uma vez: `docker compose run --rm -e COLLECTOR_INTERVAL_HOURS=0 collector`
- Pelo `docker compose up`, o serviço `collector` fica rodando e coleta a cada 6 horas (`COLLECTOR_INTERVAL_HOURS`).

## Testes

- Site: `npx vitest run`, `npx tsc --noEmit`, `npx eslint src`
- Coletor: `python -m pytest collector/tests` (o teste de upsert usa o Postgres local)

## Produção

Configure `DATABASE_URL` com a conexão PostgreSQL do Railway, além de `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` e as credenciais Google OAuth. O `Dockerfile` gera um build enxuto e roda `prisma migrate deploy` ao iniciar.
