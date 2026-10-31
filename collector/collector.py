#!/usr/bin/env python3
"""
Coletor de eventos da Sympla para o hojebelem.

Fluxo completo:
  1. Baixa pagina(s) de listagem de Belem/PA
  2. Extrai eventos via Flight parser
  3. Para cada evento: busca dados BFF (organizer + tickets)
  4. Normaliza para o schema Prisma
  5. Classifica em categoria
  6. Upsert no banco (dedupe por externalId)

Execucao:
  export DATABASE_URL="postgresql://usuario:***@host:5432/hojebelem"
  python3 -m collector.collector   (da raiz do projeto)

Variaveis de ambiente:
  DATABASE_URL             conexao PostgreSQL
  SYMPLA_BASE_URL          URL de listagem
  COLLECTOR_MAX_PAGES      max paginas por coleta (default: 5)
  COLLECTOR_MAX_DAYS_AHEAD dias no futuro a coletar (default: 120)
  COLLECTOR_AUTO_PUBLISH   publicar automaticamente (default: false; o admin revisa)
  COLLECTOR_CITY_ID        cityId fixo (opcional)
  COLLECTOR_CREATED_BY_ID  userId fixo (opcional)
"""

import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import psycopg2
import requests

from .classifier import classify_event

try:
    from sympla_parser import parse_sympla_list
    from sympla_bff import fetch_organizer, fetch_tickets
    from normalizer import normalize_event
    from db_upsert import upsert_event
except ImportError:
    from .sympla_parser import parse_sympla_list
    from .sympla_bff import fetch_organizer, fetch_tickets
    from .normalizer import normalize_event
    from .db_upsert import upsert_event

try:
    from shared import HEADERS, HTTP_TIMEOUT
except ImportError:
    from .shared import HEADERS, HTTP_TIMEOUT


# ── Configurações ─────────────────────────────────────────────────────────────

BASE_URL = os.environ.get(
    "SYMPLA_BASE_URL",
    "https://www.sympla.com.br/eventos/belem-pa"
)

MAX_PAGES = int(
    os.environ.get("COLLECTOR_MAX_PAGES", "5")
)

MAX_DAYS_AHEAD = int(
    os.environ.get("COLLECTOR_MAX_DAYS_AHEAD", "120")
)

AUTO_PUBLISH = (
    os.environ
    .get("COLLECTOR_AUTO_PUBLISH", "false")
    .lower()
    == "true"
)

MAX_RETRIES = 3

# quantos eventos buscam organizador/ingressos ao mesmo tempo
BFF_WORKERS = 5


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

logger = logging.getLogger("collector")


# ── Banco de dados ─────────────────────────────────────────────────────────────

def _get_db_url() -> str:
    """Lê a DATABASE_URL do ambiente."""

    url = os.environ.get("DATABASE_URL")

    if not url:
        raise SystemExit(
            "ERRO: variavel de ambiente DATABASE_URL nao definida."
        )

    return url


def lookup_ids(db_url: str) -> tuple:
    """
    Busca cityId da cidade de Belem e createdById do primeiro ADMIN.

    Evita deixar IDs fixos no código.
    """

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Busca cidade
        city_id = os.environ.get("COLLECTOR_CITY_ID")

        if not city_id:
            cur.execute(
                'SELECT id FROM "City" WHERE slug = %s LIMIT 1',
                ("belem",)
            )

            row = cur.fetchone()

            if not row:
                raise SystemExit(
                    "ERRO: cidade 'belem' nao encontrada no banco "
                    "(rode o seed primeiro)."
                )

            city_id = row[0]

        # Busca usuário administrador
        created_by_id = os.environ.get("COLLECTOR_CREATED_BY_ID")

        if not created_by_id:
            cur.execute(
                '''
                SELECT id
                FROM "User"
                WHERE role = %s
                ORDER BY "createdAt"
                LIMIT 1
                ''',
                ("ADMIN",)
            )

            row = cur.fetchone()

            if not row:
                raise SystemExit(
                    "ERRO: nenhum usuario ADMIN encontrado no banco "
                    "(rode o seed primeiro)."
                )

            created_by_id = row[0]

        return city_id, created_by_id

    finally:
        cur.close()
        conn.close()


# ── Requisições HTTP ──────────────────────────────────────────────────────────

def _fetch_page(url: str) -> str:
    """
    Baixa uma página HTML com algumas tentativas de retry.
    """

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(
                url,
                headers=HEADERS,
                timeout=HTTP_TIMEOUT
            )

            response.raise_for_status()

            return response.text

        except requests.RequestException as error:
            logger.warning(
                "tentativa %d falhou: %s",
                attempt + 1,
                error
            )

            time.sleep(2 ** attempt)

    return ""


def _fetch_extras(event: dict) -> tuple:
    """Organizador e ingressos de um evento; falha vira dado vazio."""

    event_id = event.get("id")

    try:
        organizer = fetch_organizer(event_id)
    except Exception:
        organizer = {}

    try:
        tickets = fetch_tickets(event_id)
    except Exception:
        tickets = {"tickets": []}

    return organizer, tickets


# ── Coleta principal ──────────────────────────────────────────────────────────

def main() -> None:
    """Executa uma coleta completa da Sympla."""

    # Conecta ao banco
    db_url = _get_db_url()

    city_id, created_by_id = lookup_ids(db_url)

    logger.info("=== iniciando coleta Sympla ===")

    all_events = []
    seen_ids = set()

    # ── Coleta paginada ────────────────────────────────────────────────────────

    for page in range(1, MAX_PAGES + 1):

        if page > 1:
            url = f"{BASE_URL}?page={page}"
        else:
            url = BASE_URL

        logger.info(
            "baixando pagina %d: %s",
            page,
            url
        )

        html = _fetch_page(url)

        if not html:
            logger.warning(
                "pagina %d vazia — parando",
                page
            )
            break

        events = parse_sympla_list(html)

        new_count = 0

        for event in events:

            event_id = str(
                event.get("id", "")
            )

            if event_id and event_id not in seen_ids:

                seen_ids.add(event_id)

                all_events.append(event)

                new_count += 1

        logger.info(
            "pagina %d: %d eventos (%d novos)",
            page,
            len(events),
            new_count
        )

        # Se não apareceu nenhum evento novo,
        # provavelmente chegamos ao final da paginação.
        if new_count == 0:
            break

    logger.info(
        "total coletado: %d eventos unicos",
        len(all_events)
    )

    # ── Limite de datas ────────────────────────────────────────────────────────

    cutoff = (
        datetime.now(timezone.utc)
        + timedelta(days=MAX_DAYS_AHEAD)
    )

    inserted = 0

    # ── Filtra pela data ───────────────────────────────────────────────────────

    to_process = []

    for event in all_events:

        if not event.get("id"):
            continue

        start_str = event.get("start_date", "")

        if start_str:
            try:
                start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))

                if start_dt > cutoff:
                    logger.info(
                        "pulando %s — data futura alem do limite",
                        event.get("name")
                    )
                    continue

            except ValueError:
                pass

        to_process.append(event)

    # ── Dados complementares, varios eventos ao mesmo tempo ───────────────────
    #
    # Cada evento faz 2 chamadas a Sympla; em fila, uma coleta grande levava
    # minutos. Poucas threads em paralelo, para nao sobrecarregar a Sympla.

    with ThreadPoolExecutor(max_workers=BFF_WORKERS) as pool:
        extras = list(pool.map(_fetch_extras, to_process))

    # ── Normalização, classificação e upsert (uma conexão só) ─────────────────

    conn = psycopg2.connect(db_url)

    try:
        for event, (organizer, tickets) in zip(to_process, extras):

            normalized = normalize_event(event, organizer, tickets)

            normalized["cityId"] = city_id
            normalized["createdById"] = created_by_id
            normalized["isPublished"] = AUTO_PUBLISH

            # Usa título + organizador para determinar a categoria do evento.
            category_name = classify_event(
                normalized["title"],
                normalized.get("organizerName", "")
            )

            normalized["categoryName"] = category_name

            logger.info(
                "categoria: %s | evento: %s",
                category_name,
                normalized["title"]
            )

            if upsert_event(conn, normalized):
                inserted += 1
                logger.info("OK: %s", normalized["title"])
            else:
                logger.warning("FALHA: %s", normalized["title"])

    finally:
        conn.close()

    # ── Finalização ────────────────────────────────────────────────────────────

    logger.info(
        "=== coleta finalizada: %d inseridos/atualizados ===",
        inserted
    )


# ── Entry point ────────────────────────────────────────────────────────────────

def run_forever(interval_hours: float) -> None:
    """Coleta de tempos em tempos; uma falha nao derruba o agendamento."""

    while True:
        try:
            main()
        except (Exception, SystemExit) as error:
            logger.exception("coleta falhou: %s", error)

        logger.info("proxima coleta em %.1f h", interval_hours)
        time.sleep(interval_hours * 3600)


if __name__ == "__main__":
    # COLLECTOR_INTERVAL_HOURS > 0: fica rodando e coleta a cada N horas
    interval = float(os.environ.get("COLLECTOR_INTERVAL_HOURS", "0"))

    if interval > 0:
        run_forever(interval)
    else:
        main()