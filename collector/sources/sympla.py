"""Conector de eventos da Sympla (listagem Next.js Flight + APIs BFF)."""

import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import requests

from ..normalizer import LINK_HOST, normalize_event, validate_event
from ..shared import HTTP_TIMEOUT, RateLimited, fetch_text
from ..sympla_bff import fetch_organizer, fetch_tickets
from ..sympla_parser import parse_sympla_list

logger = logging.getLogger("collector.sympla")

BASE_URL = os.environ.get(
    "SYMPLA_BASE_URL",
    "https://www.sympla.com.br/eventos/belem-pa",
)
MAX_RETRIES = 3
BFF_WORKERS = 2
PAGE_DELAY_SECONDS = 1.5
ALLOWED_LINK_HOSTS = (LINK_HOST,)


def _fetch_page(url: str) -> str:
    """Baixa uma pagina HTML com retry; levanta RateLimited em 429."""
    for attempt in range(MAX_RETRIES):
        try:
            return fetch_text(url, HTTP_TIMEOUT)
        except RateLimited:
            raise
        except requests.RequestException as error:
            logger.warning("tentativa %d falhou: %s", attempt + 1, error)
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
        tickets = None
    return organizer, tickets


def collect(max_pages: int, max_days_ahead: int) -> tuple[list[dict], int, int]:
    """Coleta, normaliza e valida eventos de Belem na Sympla.

    Returns:
        (valid_events, invalid_count, total_processed)
    """
    logger.info("=== iniciando coleta Sympla ===")
    all_events: list[dict] = []
    seen_ids: set[str] = set()

    for page in range(1, max_pages + 1):
        if page > 1:
            time.sleep(PAGE_DELAY_SECONDS)
            url = f"{BASE_URL}?page={page}"
        else:
            url = BASE_URL

        logger.info("baixando pagina %d: %s", page, url)
        try:
            html = _fetch_page(url)
        except RateLimited:
            logger.warning(
                "Sympla respondeu 429 na pagina %d — seguindo com o que ja temos",
                page,
            )
            break

        if not html:
            logger.warning("pagina %d vazia — parando", page)
            break

        events = parse_sympla_list(html)
        new_count = 0
        for event in events:
            event_id = str(event.get("id", ""))
            if event_id and event_id not in seen_ids:
                seen_ids.add(event_id)
                all_events.append(event)
                new_count += 1

        logger.info("pagina %d: %d eventos (%d novos)", page, len(events), new_count)
        if new_count == 0:
            break

    logger.info("total coletado (sympla): %d eventos unicos", len(all_events))

    cutoff = datetime.now(timezone.utc) + timedelta(days=max_days_ahead)
    to_process: list[dict] = []
    for event in all_events:
        if not event.get("id"):
            continue
        start_str = event.get("start_date", "")
        if start_str:
            try:
                start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=timezone.utc)
                if start_dt > cutoff:
                    logger.info(
                        "pulando %s — data futura alem do limite",
                        event.get("name"),
                    )
                    continue
            except ValueError:
                pass
        to_process.append(event)

    with ThreadPoolExecutor(max_workers=BFF_WORKERS) as pool:
        extras = list(pool.map(_fetch_extras, to_process))

    valid_events: list[dict] = []
    invalid_count = 0
    for event, (organizer, tickets) in zip(to_process, extras):
        normalized = normalize_event(event, organizer, tickets)
        problems = validate_event(normalized, allowed_hosts=ALLOWED_LINK_HOSTS)
        if problems:
            invalid_count += 1
            logger.warning(
                "evento invalido %s: %s",
                normalized["externalId"],
                "; ".join(problems),
            )
            continue
        valid_events.append(normalized)

    return valid_events, invalid_count, len(to_process)
