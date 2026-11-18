"""Constantes e helpers HTTP compartilhados pelo coletor Sympla."""
import json
import os
import threading

import requests

SITE_URL = os.environ.get("SITE_URL", "https://hojebelem.com.br")

# User-Agent honesto: identifica o coletor e dá um contato (configuravel via env)
HEADERS = {
    "User-Agent": os.environ.get(
        "SYMPLA_USER_AGENT",
        f"HojeBelemBot/1.0 (+{SITE_URL}/contato)",
    )
}

# Timeouts HTTP (segundos), configuraveis via env
HTTP_TIMEOUT = int(os.environ.get("COLLECTOR_HTTP_TIMEOUT", "30"))
BFF_TIMEOUT = int(os.environ.get("COLLECTOR_BFF_TIMEOUT", "15"))

# Tamanho maximo de resposta (paginas e APIs)
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
CHUNK_BYTES = 64 * 1024

HTTP_TOO_MANY_REQUESTS = 429

_thread_local = threading.local()


def _get_session() -> requests.Session:
    """Retorna uma Session HTTP por thread para reaproveitar conexões TCP/TLS."""
    session = getattr(_thread_local, "session", None)
    if session is None:
        session = requests.Session()
        session.headers.update(HEADERS)
        _thread_local.session = session
    return session


class ResponseTooLarge(requests.RequestException):
    """A resposta passou de MAX_RESPONSE_BYTES."""


class RateLimited(requests.RequestException):
    """A Sympla respondeu 429 (muitas requisicoes)."""


def fetch_text(url: str, timeout: int) -> str:
    """GET com limite de tamanho. Levanta RequestException em qualquer falha."""
    with _get_session().get(url, timeout=timeout, stream=True) as resp:
        if resp.status_code == HTTP_TOO_MANY_REQUESTS:
            raise RateLimited(f"429 em {url}")
        resp.raise_for_status()

        body = bytearray()
        for chunk in resp.iter_content(chunk_size=CHUNK_BYTES):
            body.extend(chunk)
            if len(body) > MAX_RESPONSE_BYTES:
                raise ResponseTooLarge(
                    f"resposta maior que {MAX_RESPONSE_BYTES} bytes: {url}"
                )

        return bytes(body).decode(resp.encoding or "utf-8", errors="replace")


def fetch_json(url: str, timeout: int):
    """Como fetch_text, devolvendo o JSON; JSON invalido vira RequestException."""
    try:
        return json.loads(fetch_text(url, timeout))
    except ValueError as error:
        raise requests.RequestException(f"JSON invalido em {url}") from error
