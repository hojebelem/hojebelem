"""
APIs BFF da Sympla — endpoints HTTP publicos sem autenticacao.

A propria pagina de evento da Sympla chama estes endpoints para carregar
dados do organizador e tipos de ingresso. Sao acessiveis publicamente
com um HTTP GET simples.

URL base: https://event-page.svc.sympla.com.br/api/event-bff/purchase/event/{id}/
"""
import os

try:
    from shared import BFF_TIMEOUT, fetch_json  # modo script
except ImportError:
    from .shared import BFF_TIMEOUT, fetch_json  # modo pacote (pytest)

# URL base das APIs BFF (configuravel via env)
BFF_BASE = os.environ.get(
    "SYMPLA_BFF_BASE_URL",
    "https://event-page.svc.sympla.com.br/api/event-bff/purchase/event",
)


def _validate_event_id(event_id) -> int:
    """Garante que o ID do evento é um inteiro positivo antes de montar a URL."""
    if isinstance(event_id, bool):
        raise ValueError(f"event_id invalido: {event_id!r}")
    text = str(event_id).strip()
    if not text.isdigit():
        raise ValueError(f"event_id invalido: {event_id!r}")
    return int(text)


def _fetch_bff(event_id: int | str, path: str) -> dict:
    """Busca um endpoint BFF generico para um evento.

    Args:
        event_id: ID numerico do evento na Sympla (ex: 3483046)
        path: sufixo do endpoint (ex: "organizer", "tickets")

    Returns:
        dict com o JSON retornado pela API

    Raises:
        ValueError: se event_id nao for numerico
        requests.RequestException: se a API falhar
    """
    numeric_id = _validate_event_id(event_id)
    url = f"{BFF_BASE.rstrip('/')}/{numeric_id}/{path}"
    return fetch_json(url, BFF_TIMEOUT)


def fetch_organizer(event_id: int | str) -> dict:
    """Busca dados do organizador de um evento.

    Returns:
        dict com: name, fantasyName, documentType, document
    """
    return _fetch_bff(event_id, "organizer")


def fetch_tickets(event_id: int | str) -> dict:
    """Busca tipos de ingresso e precos de um evento.

    Returns:
        dict com chave "tickets" — lista de ingressos, cada um com:
        name, salePriceMonetary, installments, availableQty, status, etc.
    """
    return _fetch_bff(event_id, "tickets")
