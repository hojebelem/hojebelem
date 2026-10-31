---
name: hojebelem
description: Regras e convenções do projeto Hoje Belém (site de eventos de Belém em Next.js 16 + Prisma + Postgres, com coletor Python da Sympla). Use SEMPRE antes de mexer em qualquer arquivo deste repositório — interface, CSS, animações, cards, admin, banco, coletor, Docker ou commits.
---

# Hoje Belém

Site mobile-first para descobrir e divulgar eventos em Belém/PA. Next.js 16 (App Router, Turbopack), Prisma 6 + PostgreSQL, NextAuth v5, CSS puro em `src/app/globals.css`. Coletor em Python (`collector/`) traz eventos da Sympla.

Antes de escrever código Next, leia `AGENTS.md`: esta versão do Next tem mudanças (por exemplo, o middleware se chama `src/proxy.ts`).

## Identidade visual (não alterar)

- Cores em `:root` do `globals.css`: `--violet #703b94`, `--deep #201c57`, `--ink`, `--muted`, `--line`, `--paper`, `--gradient`. Use as variáveis, não cores novas.
- Fonte Manrope. **Nenhum texto abaixo de 12px**; texto de leitura em 14px ou mais.
- Conteúdo alinhado ao contêiner `.shell` (máx. 1180px, 20px de margem). Nada colado na borda da tela enquanto o resto é centralizado.
- Títulos de seção: `section-heading` com rótulo pequeno em caixa alta (`p`) + `h2`.
- O usuário não quer enfeites que ele não pediu: não adicionar textos, selos, emojis flutuantes ou ícones decorativos por conta própria. Mudança visual = só o que foi pedido.

## Animações e transições

Regra do usuário: o site deve ser fluido **como a Sympla**, sem exagero.

- **Transições de interação sempre animam**, mesmo com "efeitos de animação" desligados no Windows (`prefers-reduced-motion: reduce`): hover, slides, carrossel, abrir busca, etc.
- O bloco `@media (prefers-reduced-motion: reduce)` no fim do `globals.css` **só** desliga animações decorativas em loop (confete, emojis, mini-post). Nunca volte a pôr `* { transition: none }` ali.
- Anime **apenas `transform` e `opacity`** (rodam na placa de vídeo). Para escurecer/clarear, use uma camada (`::after` com `opacity`), não `filter`. Use `will-change: transform, opacity` em itens que se movem.
- Durações curtas e suaves: 0,2–0,35s para hover/abrir; 0,7s para deslizes; curva `cubic-bezier(0.22, 0.61, 0.36, 1)` ou ease-in-out cúbico.
- **Não use `scrollTo({ behavior: "smooth" })`** para deslizes: o Chrome no Windows desliga isso quando as animações do sistema estão desligadas. Os deslizes do `ScrollRow` são animados em JS com `requestAnimationFrame` (700ms, ease-in-out).
- Em componentes com scroll, **não chame `setState` a cada evento de scroll** — só quando o valor muda (veja `ScrollRow`), senão a animação engasga.
- O painel de preview do Claude desenha poucos quadros por segundo e reporta `prefers-reduced-motion: reduce`; ali animações parecem travadas. Fluidez se julga no navegador do usuário, de preferência com `npm run build && npm start`.
- Cursor do mouse: o padrão do sistema. Não criar cursor personalizado.

## Componentes para reaproveitar

| Precisa de | Use |
|---|---|
| Fileira horizontal com setas (categorias, eventos) | `ScrollRow` (`src/components/scroll-row.tsx`) |
| Seção com título + fileira de eventos | `EventSection` (`section.tsx`) — esconda a seção se a lista estiver vazia, nunca preencha com eventos de outro dia/categoria |
| Card de evento | `EventCard`: título, local (só o nome do local, sem cidade), data completa ("Sábado, 31 de Out às 20:00"), rodapé com status à esquerda e preço à direita, altura fixa do rodapé para alinhar a linha |
| Carrossel do banner | `HeroCarousel` (destaques; sem destaques, próximos eventos) |
| Busca no topo | `HeaderSearch` |
| Datas e status | `src/lib/events.ts`: `formatEventFullDate`, `formatEventDate`, `getEventStatus`, `isEventEnded`, `startOfTodayInBelem` |

## Dados e regras de negócio

- Fuso **sempre `America/Belem`**. `datetime-local` do admin é convertido com `fromZonedTime(valor, TIMEZONE)`. Nunca `new Date(string)` sem fuso.
- `getEvents` só traz eventos publicados que ainda não acabaram (com `endAt`, até o horário final; sem ele, até o fim do dia). Detalhe do evento busca direto pelo `slug`.
- Status exibidos: "É Hoje", "É amanhã", "Em breve", "Já encerrou", "Adiado", "Cancelado".
- Preço `null` = gratuito.
- **Cache de dados** (`src/lib/data.ts`): eventos (5 min) e categorias (10 min) ficam em `unstable_cache` com as tags `events` e `categories`. Toda ação do admin que muda evento chama `updateTag(EVENTS_TAG)` (via `revalidateEventPages`). O cache guarda JSON: datas voltam como texto e passam por `reviveDates`. O coletor grava direto no banco, então os eventos dele aparecem em até 5 minutos.
- Favoritos da página: `getSavedEventIds` (uma consulta por requisição). Não volte a consultar por card.
- Imagem de capa de domínio fora de `images.remotePatterns` usa `unoptimized` (`isOptimizableImage` em `src/lib/images.ts`), senão o Next derruba a página. As duas listas de domínios precisam ficar iguais.
- Imagens do site em WebP (`public/images/*.webp`). Os `.png` antigos só existem para eventos já salvos no banco com esse caminho.

## Fluxo de revisão do coletor

- O coletor insere eventos como rascunho (`COLLECTOR_AUTO_PUBLISH=false`), com `source = 'sympla'`.
- Pendentes de revisão = `source != 'manual'`, `reviewedAt` nulo e `rejectedAt` nulo. Aparecem no topo de `/admin/eventos` com Aprovar / Revisar / Descartar.
- Aprovar ou salvar edição preenche `reviewedAt`. Descartar preenche `rejectedAt`.
- Depois de revisado, a coleta só atualiza **data, hora final, preço e link**; título, local, endereço, descrição, capa e categoria ficam como o admin deixou. A coleta nunca mexe em `slug` nem `isPublished` de evento existente.
- Imagens de evento são por URL (sem upload).

## Admin e contas

- Telas: `/admin` (painel + bloco do coletor), `/admin/eventos` (abas por situação, busca, 30 por página, pendentes no topo), `/admin/eventos/novo` e `/editar`, `/admin/categorias`, `/admin/usuarios`. Navegação em `src/components/admin-nav.tsx` (layout `src/app/admin/layout.tsx`).
- Ação destrutiva sempre com `AdminConfirmButton`. Evento do coletor (`source = "sympla"`) se **descarta**, não se exclui (excluído voltaria na próxima coleta).
- Formulários validam com `safeParse` e devolvem `?erro=...` mostrado com a classe `auth-error`; nunca `.parse` que quebra a página.
- Slugs: `slugify` / `makeSlug` em `actions.ts`.
- Público: `/divulgar` manda evento com `source = "organizador"` para os Pendentes; `/favoritar/[id]` salva o favorito depois do login; Sair no Perfil.
- Login limitado a 10 tentativas por e-mail a cada 15 min (`src/lib/rate-limit.ts`, em memória).
- Filtros da lista pública: `?data=` (hoje, amanha, fim-de-semana, AAAA-MM-DD — `eventDateRange`), `?ordem=preco`, `?destaque=1`, `?pagina=`; links montados por `eventsHref`.

## Banco e ambiente (Windows)

- Mudou o `schema.prisma`: `npx prisma migrate dev --name <nome>`. **Pare o `npm run dev` antes** e rode `npx prisma generate`, senão dá `EPERM` (o servidor trava a DLL do Prisma) e as páginas quebram com "Unknown argument".
- Seed (`npm run db:seed`) cria cidade `belem`, categorias, admin `admin@hojebelem.local` e eventos de exemplo; atualiza nome/ícone das categorias.
- Postgres local: `docker compose up -d postgres`. App em `http://localhost:3000`.
- Docker do app: build em duas etapas com `output: "standalone"` (ligado só pela variável `NEXT_STANDALONE` do Dockerfile; o `npm start` local continua normal). A CLI do Prisma para `migrate deploy` é instalada à parte em `/prisma-cli`. `.dockerignore` impede `node_modules`, `.next` e `.env` de entrarem na imagem.
- Coletor: uma conexão com o banco para a coleta inteira (`upsert_event` aceita conexão ou URL) e busca organizador/ingressos em paralelo (`BFF_WORKERS = 5`). Teste da regra de revisão em `collector/tests/test_db_upsert.py` (precisa do Postgres local).
- Comandos para o usuário em PowerShell (`copy`, here-strings `@" "@`), não bash.
- Segurança do coletor: tudo da Sympla é dado não confiável. `validate_event` (link só `https` da Sympla, limites de texto/data/preço) e capa só de `images.sympla.com.br` em `normalizer.py`; preço desconhecido (`priceUnknown`) não vira gratuito; freio `should_abort` (>30% inválidos não grava nada); 1,5 s entre páginas, 2 buscas paralelas, para com 429, 5 MB por resposta (`fetch_text`/`fetch_json` em `shared.py`). O compose conecta como `hojebelem_collector` (crie com `collector/db-role.sql` depois das migrations); se o coletor precisar de tabela nova, dê o GRANT nesse arquivo.

## Verificação antes de dizer "pronto"

1. `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`.
2. Abrir a página mexida no navegador, no desktop e no celular (375px), e checar que não há rolagem lateral.
3. Dizer claramente o que não foi testado (login, admin, fluidez real).

## Git

- Trabalho na branch `vinicius`.
- Commits **sem coautoria do Claude** (sem `Co-Authored-By`, sem "Generated with"). Ver a skill `no-coauthor`.
- Não commitar `prisma/migrations/migration_lock.toml` quando a mudança for só quebra de linha.
- Commit só quando o usuário pedir.

## Pendências

O que falta no site está em `RELATORIO.md` (itens numerados por bloco). Ao concluir um item, marque como ✅ lá.
