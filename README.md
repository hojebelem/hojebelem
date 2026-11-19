# Hoje Belém

Plataforma mobile-first para descoberta e divulgação de eventos em Belém/PA.

## Recursos

- **Descoberta e mapa:** filtros por data (`hoje`, `amanhã`, `fim de semana`, dia específico), categoria, bairro de Belém, preço e busca, com alternância **Lista / Mapa** (Leaflet + OpenStreetMap) em `/eventos`, mapa de favoritos em `/wishlist` e mapa do local em `/eventos/[slug]`.
- **Contas e perfil:** login/cadastro por e-mail e Google OAuth, recuperação de senha (`/esqueci-senha` / `/redefinir-senha`), edição de perfil (`/perfil/editar`) com upload de avatar (`UPLOAD_DIR` servido em `/uploads/[filename]`), troca de e-mail/senha e exclusão de conta (LGPD).
- **Divulgação e admin:** formulário público `/divulgar` (vai para fila de revisão) e painel `/admin` com gestão de eventos, lixeira/descartados, categorias, usuários e histórico real de execuções do coletor (`CollectorRun`).

## Desenvolvimento

1. Copie `.env.example` para `.env`.
2. Rode `docker compose up -d postgres`.
3. Rode `npm install`, `npx prisma migrate dev` e `npm run db:seed`.
4. Inicie com `npm run dev` e acesse `http://localhost:3000`.

O seed cria o administrador `admin@hojebelem.local` com a senha temporária `MudeEstaSenha123!`. Troque-a fora do ambiente local. O painel fica em `/admin` (link "Painel admin" no Perfil).

Para subir app, banco e coletor juntos: `docker compose up --build`.

### Quando o `schema.prisma` mudar (Windows)

O `npm run dev` trava o arquivo do Prisma no Windows. Para aplicar mudanças no banco:

1. Pare o `npm run dev` (`Ctrl+C`).
2. Rode `npx prisma migrate dev` (aplica as migrations novas).
3. Rode `npx prisma generate`.
4. Suba de novo com `npm run dev`.

Se pular isso, as páginas quebram com erros como `Unknown argument` ou `EPERM`.

## Coletor automático

Traz eventos de Belém (atualmente via Sympla, com suporte a `--source` / `COLLECTOR_SOURCES`) para a fila **Pendentes de revisão** do admin e registra cada execução em `CollectorRun`. Detalhes em [`collector/README.md`](collector/README.md).

- Crie/atualize o usuário restrito do coletor no banco (depois das migrations): `docker compose exec -T postgres psql -U postgres -d hojebelem < collector/db-role.sql`. Ele só lê cidade, categorias e id/papel dos usuários, grava eventos e registra `CollectorRun`; não lê senhas nem apaga eventos.
- Rodar uma vez: `docker compose run --rm -e COLLECTOR_INTERVAL_HOURS=0 collector`
- Pelo `docker compose up`, o serviço `collector` fica rodando e coleta a cada 6 horas (`COLLECTOR_INTERVAL_HOURS`).

## Testes e build

- Site: `npm run typecheck`, `npm run lint`, `npm test` (`vitest run`) e `npm run build`
- Coletor: `python -m pytest collector/tests` (o teste de upsert usa o Postgres local)

## Produção

O `Dockerfile` gera um build `standalone` enxuto e roda `prisma migrate deploy` ao iniciar. O endpoint `GET /api/health` verifica app e conexão com o banco.

- **Obrigatórias:** `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`.
- **Login com Google:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **Recuperação de senha por e-mail (Resend):** `RESEND_API_KEY` e opcionalmente `EMAIL_FROM` (em desenvolvimento, sem a chave, o link sai no console do servidor).
- **Avatares persistentes:** monte um volume persistente e aponte `UPLOAD_DIR` (ex.: `/data/uploads`); as imagens são servidas em `/uploads/[filename]`.
- **Coletor e anúncios (opcionais):** `COLLECTOR_DATABASE_URL` (usuário restrito `hojebelem_collector`) e `NEXT_PUBLIC_ADSENSE_CLIENT_ID` / `NEXT_PUBLIC_ADSENSE_*`.
