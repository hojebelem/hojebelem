# Coletor Sympla — hojebelem

Coleta eventos de Belém/PA da Sympla e insere no banco do site automaticamente.

## Fluxo

```
sympla.com.br/eventos/belem-pa  →  parser Flight  →  APIs BFF (organizer/tickets)
        ↓
   normalizer (schema Event)  →  upsert no Postgres (dedupe por externalId)
```

## Arquivos

| Arquivo | Função |
|---|---|
| `collector.py` | Entrypoint: baixa páginas, orquestra o fluxo |
| `sympla_parser.py` | Extrai eventos do payload Flight (Next.js) da Sympla |
| `sympla_bff.py` | APIs BFF públicas da Sympla (organizador + ingressos/preços) |
| `normalizer.py` | Converte dados brutos para o schema Prisma `Event` |
| `classifier.py` | Classifica eventos por palavras-chave (Música, Teatro, etc.) |
| `db_upsert.py` | Insert/update no Postgres com dedupe por `externalId` |
| `shared.py` | Constantes compartilhadas (User-Agent, timeouts) |
| `image_downloader.py` | Download de imagens locais (postergado; usa-se URL externa) |
| `Dockerfile.collector` | Container do coletor (serviço no compose) |
| `tests/` | Testes pytest (o de upsert precisa do Postgres local) |

## Execução manual

Rode da raiz do projeto, como módulo (o coletor usa imports relativos):

```bash
export DATABASE_URL="postgresql://usuario:***@host:5432/hojebelem"
python3 -m collector.collector
```

Pelo Docker (usa o banco do `docker-compose.yml`):

```bash
docker compose run --rm collector
```

Os eventos entram como **pendentes de revisão** em `/admin/eventos`
(`COLLECTOR_AUTO_PUBLISH=false`). Depois que o admin revisa, a coleta só
atualiza data, hora final, preço e link. Como o site guarda eventos em cache,
eventos novos do coletor aparecem em até 5 minutos.

## Variáveis de ambiente

| Variável | Default | Função |
|---|---|---|
| `DATABASE_URL` | (obrigatória) | Conexão PostgreSQL — **nunca colocar no código** |
| `SYMPLA_BASE_URL` | eventos/belem-pa | URL de listagem |
| `COLLECTOR_MAX_PAGES` | 5 | Máximo de páginas por coleta |
| `COLLECTOR_MAX_DAYS_AHEAD` | 120 | Coleta eventos até N dias no futuro |
| `COLLECTOR_INTERVAL_HOURS` | 0 | Maior que 0: fica rodando e coleta a cada N horas (o compose usa 6) |
| `COLLECTOR_AUTO_PUBLISH` | false | Publicar sem revisão do admin (por padrão entram como pendentes em `/admin/eventos`) |
| `COLLECTOR_CITY_ID` | (busca slug `belem`) | cityId fixo opcional |
| `COLLECTOR_CREATED_BY_ID` | (busca 1º admin) | userId fixo opcional |
| `SITE_URL` | https://hojebelem.com.br | Site do projeto; entra no User-Agent do coletor |
| `SYMPLA_USER_AGENT` | `HojeBelemBot/1.0 (+SITE_URL/contato)` | User-Agent das requisições |
| `COLLECTOR_HTTP_TIMEOUT` | 30 | Timeout das páginas (segundos) |
| `COLLECTOR_BFF_TIMEOUT` | 15 | Timeout das APIs BFF (segundos) |

## Segurança

Tudo que vem da Sympla é tratado como dado não confiável.

- **Validação:** o link de compra só vale se for `https` e da Sympla; a capa só
  vale se vier de `images.sympla.com.br` (senão entra a capa padrão); há limites
  de tamanho de texto, de data (não pode ter começado há mais de 1 dia) e de
  preço (0 a 100.000). Evento inválido não é gravado e vai para o log.
- **Preço desconhecido não vira gratuito:** se os ingressos não vierem, o evento
  fica de fora até a próxima coleta.
- **Freio de 30%:** com 5 eventos ou mais, se mais de 30% forem inválidos, a
  coleta não grava nada (a Sympla pode ter mudado o site).
- **Ritmo:** 1,5 s entre páginas da listagem, 2 buscas de ingressos ao mesmo
  tempo; um 429 da Sympla interrompe a listagem (segue com o que já baixou).
- **Limite de 5 MB** por resposta (páginas e APIs).
- **User-Agent identificado** (`HojeBelemBot/1.0`), com link de contato.
- Tudo continua passando pela **revisão do admin** antes de ser publicado.

## Testes

```bash
python3 -m pytest collector/tests/ -v
```

## Notas

- Os IDs do seed (`cityId`, `createdById`) são buscados dinamicamente no banco
  (cidade `belem` e 1º usuário ADMIN) — nada hardcoded.
- Imagens: usa a URL externa da Sympla (`images.sympla.com.br`) — o Next.js
  precisa de `images.sympla.com.br` em `next.config.ts` (já configurado).
- O parser depende do formato interno do Next.js da Sympla (payload Flight).
  Se a Sympla mudar a implementação, o parser quebra — os testes de fixture
  alertam.
