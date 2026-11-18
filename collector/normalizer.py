"""
Normalizador e validador de eventos para o schema Prisma do hojebelem.

Mantem validacao generica (para todas as fontes) e normalizacao da Sympla.
"""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

DEFAULT_COVER = "/images/hero-belem.webp"

COVER_HOST = "images.sympla.com.br"
LINK_HOST = "sympla.com.br"

MAX_TITLE = 200
MAX_VENUE = 200
MAX_ADDRESS = 300
MAX_PRICE = 100_000
MAX_PAST_DAYS = 1


def _clean_title(title: str) -> str:
    """Remove sufixo de cidade/estado do titulo (ex: '| Belem/PA')."""
    return title.split(" | ")[0].strip()


def _text(value) -> str:
    """Texto sem espacos nas pontas; None vira vazio."""
    return str(value or "").strip()


def _format_address(loc: dict) -> str:
    """Monta o endereço sem separadores duplicados quando algum campo falta."""
    street = ", ".join(
        part for part in (_text(loc.get("address")), _text(loc.get("address_num"))) if part
    )
    neighborhood = _text(loc.get("neighborhood"))
    return " - ".join(part for part in (street, neighborhood) if part)


def make_external_id(source: str, raw_id) -> str:
    """Preserva IDs legados da Sympla e prefixa novas fontes para evitar colisao."""
    text = str(raw_id or "").strip()
    if not text:
        return ""
    return text if source == "sympla" else f"{source}:{text}"


def _price_of(ticket: dict):
    """Preco (decimal) de um ingresso, ou None se ausente/invalido."""
    price = ticket.get("salePriceWithDiscountMonetary") or ticket.get("salePriceMonetary")
    if not price:
        return None
    try:
        return float(price.get("decimal"))
    except (TypeError, ValueError):
        return None


def parse_price(tickets: dict | None) -> float | None:
    """Menor preco dos ingressos; None se gratuito (menor = 0) ou desconhecido."""
    items = (tickets or {}).get("tickets") or []
    prices = [p for p in map(_price_of, items) if p is not None]
    if not prices:
        return None
    lowest = min(prices)
    return lowest if lowest > 0 else None


_parse_price = parse_price


def safe_cover(url, allowed_hosts: tuple[str, ...] = (COVER_HOST,)) -> str:
    """So aceita capa https servida pelos hosts confiaveis da fonte."""
    parsed = urlparse(_text(url))
    if parsed.scheme == "https" and (parsed.hostname or "") in allowed_hosts:
        return parsed.geturl()
    return DEFAULT_COVER


_safe_cover = safe_cover


def normalize_event(raw: dict, organizer: dict, tickets: dict | None) -> dict:
    """Converte dados brutos da Sympla para o schema Event do Prisma."""
    loc = raw.get("location", {}) or {}
    imgs = raw.get("images", {}) or {}
    org_name = _text(organizer.get("fantasyName") or organizer.get("name", ""))
    items = (tickets or {}).get("tickets") or []
    # sem ingressos, ou ingressos sem nenhum preço legível: não dá para dizer que é gratuito
    price_unknown = all(_price_of(item) is None for item in items)

    return {
        "title": _clean_title(_text(raw.get("name", ""))),
        "slug": f"sympla-{raw.get('id', '')}",  # sympla-<id> p/ evitar colisao com slugs do seed
        "externalId": make_external_id("sympla", raw.get("id")),
        "source": "sympla",
        "startAt": raw.get("start_date"),
        "endAt": raw.get("end_date"),
        "venueName": _text(loc.get("name", "")),
        "address": _format_address(loc),
        "latitude": loc.get("lat"),
        "longitude": loc.get("lon"),
        "externalPurchaseLink": _text(raw.get("url", "")),
        "coverImageUrl": safe_cover(imgs.get("original")),
        "price": parse_price(tickets),
        "priceUnknown": price_unknown,
        "description": f"Organizado por {org_name}".strip(),
        "organizerName": org_name,
        "isPublished": False,
    }


def _parse_date(value) -> datetime | None:
    """ISO 8601 (aceita 'Z') para datetime com fuso; None se invalido."""
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _valid_link(link, allowed_hosts: tuple[str, ...] = (LINK_HOST,)) -> bool:
    parsed = urlparse(link or "")
    host = parsed.hostname or ""
    return parsed.scheme == "https" and any(
        host == allowed or host.endswith("." + allowed) for allowed in allowed_hosts
    )


def validate_event(
    event: dict,
    now: datetime | None = None,
    allowed_hosts: tuple[str, ...] = (LINK_HOST,),
) -> list[str]:
    """Lista de problemas do evento normalizado (vazia = pode gravar)."""
    now = now or datetime.now(timezone.utc)
    problems = []

    if not _valid_link(event.get("externalPurchaseLink"), allowed_hosts):
        problems.append("link de compra invalido ou fora do dominio permitido")

    for field, label, limit in (
        ("title", "titulo", MAX_TITLE),
        ("venueName", "local", MAX_VENUE),
        ("address", "endereco", MAX_ADDRESS),
    ):
        if not 1 <= len(event.get(field) or "") <= limit:
            problems.append(f"{label} vazio ou maior que {limit} caracteres")

    start = _parse_date(event.get("startAt"))
    if start is None:
        problems.append("data de inicio invalida")
    elif start < now - timedelta(days=MAX_PAST_DAYS):
        problems.append("evento ja comecou ha mais de 1 dia")

    if event.get("endAt"):
        end = _parse_date(event["endAt"])
        if end is None:
            problems.append("data de fim invalida")
        elif start is not None and end <= start:
            problems.append("fim nao e depois do inicio")

    price = event.get("price")
    if price is not None and not 0 <= price <= MAX_PRICE:
        problems.append("preco fora da faixa")
    if event.get("priceUnknown"):
        problems.append("ingressos indisponiveis")

    return problems
