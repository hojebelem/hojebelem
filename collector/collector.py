#!/usr/bin/env python3
"""
Orquestrador de coleta de eventos para o hojebelem.

Execucao:
  python3 -m collector.collector               (roda todas as fontes em COLLECTOR_SOURCES)
  python3 -m collector.collector --source sympla
"""

import argparse
from datetime import datetime, timezone
import logging
import os
import time

import psycopg2

from .classifier import classify_event
from .db_upsert import load_category_map, record_collector_run, upsert_event
from .sources import SOURCES

MAX_PAGES = int(os.environ.get("COLLECTOR_MAX_PAGES", "5"))
MAX_DAYS_AHEAD = int(os.environ.get("COLLECTOR_MAX_DAYS_AHEAD", "120"))
AUTO_PUBLISH = os.environ.get("COLLECTOR_AUTO_PUBLISH", "false").lower() == "true"

# freio de emergencia: com pelo menos MIN_EVENTS_FOR_ABORT eventos, mais de
# MAX_INVALID_RATIO invalidos indica que a fonte mudou o site
MIN_EVENTS_FOR_ABORT = 5
MAX_INVALID_RATIO = 0.3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("collector")


def _get_db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("ERRO: variavel de ambiente DATABASE_URL nao definida.")
    return url


def lookup_ids(db_url: str) -> tuple[str, str]:
    """Busca cityId de Belem e createdById do primeiro ADMIN."""
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    try:
        city_id = os.environ.get("COLLECTOR_CITY_ID")
        if not city_id:
            cur.execute('SELECT id FROM "City" WHERE slug = %s LIMIT 1', ("belem",))
            row = cur.fetchone()
            if not row:
                raise SystemExit(
                    "ERRO: cidade 'belem' nao encontrada no banco (rode o seed primeiro)."
                )
            city_id = row[0]

        created_by_id = os.environ.get("COLLECTOR_CREATED_BY_ID")
        if not created_by_id:
            cur.execute(
                'SELECT id FROM "User" WHERE role = %s ORDER BY "createdAt" LIMIT 1',
                ("ADMIN",),
            )
            row = cur.fetchone()
            if not row:
                raise SystemExit(
                    "ERRO: nenhum usuario ADMIN encontrado no banco (rode o seed primeiro)."
                )
            created_by_id = row[0]

        return city_id, created_by_id
    finally:
        cur.close()
        conn.close()


def should_abort(total: int, invalid: int) -> bool:
    """True quando ha eventos suficientes e invalidos demais."""
    return total >= MIN_EVENTS_FOR_ABORT and invalid / total > MAX_INVALID_RATIO


def resolve_sources(requested: list[str] | None = None) -> list[str]:
    """Lista ordenada de fontes validas a executar."""
    raw = requested or [
        item.strip().lower()
        for item in os.environ.get("COLLECTOR_SOURCES", "sympla").split(",")
        if item.strip()
    ]
    unknown = [name for name in raw if name not in SOURCES]
    if unknown:
        raise SystemExit(f"ERRO: fonte(s) desconhecida(s): {', '.join(unknown)}")
    return raw


def main(sources: list[str] | None = None) -> None:
    """Executa a coleta para todas as fontes selecionadas."""
    enabled = resolve_sources(sources)
    db_url = _get_db_url()
    city_id, created_by_id = lookup_ids(db_url)

    conn = psycopg2.connect(db_url)
    total_inserted = 0
    try:
        category_map = load_category_map(conn)

        for source_name in enabled:
            started_at = datetime.now(timezone.utc)
            try:
                valid_events, invalid_count, total_processed = SOURCES[source_name](
                    MAX_PAGES,
                    MAX_DAYS_AHEAD,
                )
            except Exception as error:
                logger.exception("fonte %s falhou: %s", source_name, error)
                record_collector_run(
                    conn,
                    source_name,
                    started_at,
                    "ERROR",
                    error_message=str(error),
                )
                continue

            if should_abort(total_processed, invalid_count):
                msg = (
                    f"mais de 30% invalidos ({invalid_count} de {total_processed}): "
                    "estrutura pode ter mudado."
                )
                logger.error("[%s] %s Nada gravado para esta fonte.", source_name, msg)
                record_collector_run(
                    conn,
                    source_name,
                    started_at,
                    "ABORTED",
                    fetched_count=total_processed,
                    invalid_count=invalid_count,
                    error_message=msg,
                )
                continue

            inserted = 0
            for normalized in valid_events:
                normalized["cityId"] = city_id
                normalized["createdById"] = created_by_id
                normalized["isPublished"] = AUTO_PUBLISH
                normalized["categoryName"] = classify_event(
                    normalized["title"],
                    normalized.get("organizerName", ""),
                )
                if upsert_event(conn, normalized, category_map=category_map):
                    inserted += 1
                    logger.info("OK [%s]: %s", source_name, normalized["title"])
                else:
                    logger.warning("FALHA [%s]: %s", source_name, normalized["title"])

            record_collector_run(
                conn,
                source_name,
                started_at,
                "OK",
                fetched_count=total_processed,
                upserted_count=inserted,
                invalid_count=invalid_count,
            )
            total_inserted += inserted
            logger.info("=== [%s] finalizada: %d inseridos/atualizados ===", source_name, inserted)
    finally:
        conn.close()

    logger.info("=== coleta completa: %d eventos inseridos/atualizados ===", total_inserted)


def run_forever(interval_hours: float, sources: list[str] | None = None) -> None:
    """Coleta de tempos em tempos; erro transiente nao derruba o agendamento."""
    while True:
        try:
            main(sources)
        except Exception as error:
            logger.exception("coleta falhou: %s", error)
        logger.info("proxima coleta em %.1f h", interval_hours)
        time.sleep(interval_hours * 3600)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Coletor de eventos do hojebelem")
    parser.add_argument(
        "--source",
        action="append",
        help="Fonte especifica (pode repetir). Padrao: COLLECTOR_SOURCES.",
    )
    args = parser.parse_args()

    interval = float(os.environ.get("COLLECTOR_INTERVAL_HOURS", "0"))
    if interval > 0:
        run_forever(interval, args.source)
    else:
        main(args.source)
