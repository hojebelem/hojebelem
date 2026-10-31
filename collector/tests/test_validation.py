"""
Contrato da validacao do coletor: o que vem da Sympla e dado nao confiavel.

- normalize_event troca capa de dominio estranho pela capa padrao do site
  e marca "priceUnknown" quando os ingressos nao vieram.
- parse_price: menor preco; 0 vira None (gratuito); lista vazia ou None = desconhecido.
- validate_event devolve a lista de problemas (vazia = pode gravar).
- should_abort: freio de emergencia quando muitos eventos vem invalidos.
"""
from datetime import datetime, timezone

from collector.collector import should_abort
from collector.normalizer import (
    DEFAULT_COVER,
    normalize_event,
    parse_price,
    validate_event,
)

NOW = datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc)

RAW = {
    "id": 3483046,
    "name": "The Black Parade | Belem/PA",
    "url": "https://www.sympla.com.br/evento/the-black-parade-belem-pa/3483046",
    "start_date": "2026-08-23T01:00:00+00:00",
    "end_date": "2026-08-23T06:00:00+00:00",
    "images": {"original": "https://images.sympla.com.br/6a42b6266af4f.jpg"},
    "location": {"name": "Studio Pub", "address": "Rua Presidente Pernambuco",
                 "address_num": "277", "neighborhood": "Batista Campos"},
}
ORGANIZER = {"fantasyName": "THE BLACK PARADE"}
TICKETS = {"tickets": [{"salePriceMonetary": {"decimal": 38.99}}]}


def ev(**changes):
    return {**normalize_event(RAW, ORGANIZER, TICKETS), **changes}


# ── preco ─────────────────────────────────────────────────────────────────────

def test_preco_menor_valor():
    tickets = {"tickets": [{"salePriceMonetary": {"decimal": 80}},
                           {"salePriceMonetary": {"decimal": 38.99}}]}
    assert parse_price(tickets) == 38.99


def test_preco_zero_e_gratuito():
    tickets = {"tickets": [{"salePriceMonetary": {"decimal": 0}}]}
    assert parse_price(tickets) is None


def test_sem_ingressos_nao_vira_gratuito():
    assert normalize_event(RAW, ORGANIZER, {"tickets": []})["priceUnknown"] is True
    assert normalize_event(RAW, ORGANIZER, None)["priceUnknown"] is True
    assert normalize_event(RAW, ORGANIZER, TICKETS)["priceUnknown"] is False


# ── links e capa ──────────────────────────────────────────────────────────────

def test_evento_valido_nao_tem_problemas():
    assert validate_event(ev(), now=NOW) == []


def test_link_precisa_ser_https_da_sympla():
    for bad in ["javascript:alert(1)", "http://www.sympla.com.br/evento/1",
                "https://evil.com/evento", "https://evilsympla.com.br/x",
                "https://sympla.com.br.evil.com/x", ""]:
        assert validate_event(ev(externalPurchaseLink=bad), now=NOW), bad
    for good in ["https://sympla.com.br/evento/1",
                 "https://bilheteria.sympla.com.br/evento/1"]:
        assert validate_event(ev(externalPurchaseLink=good), now=NOW) == [], good


def test_capa_de_outro_dominio_vira_capa_padrao():
    raw = {**RAW, "images": {"original": "https://evil.com/x.jpg"}}
    assert normalize_event(raw, ORGANIZER, TICKETS)["coverImageUrl"] == DEFAULT_COVER
    raw = {**RAW, "images": {}}
    assert normalize_event(raw, ORGANIZER, TICKETS)["coverImageUrl"] == DEFAULT_COVER


# ── campos ────────────────────────────────────────────────────────────────────

def test_textos_obrigatorios_e_com_limite():
    assert validate_event(ev(title=""), now=NOW)
    assert validate_event(ev(title="x" * 201), now=NOW)
    assert validate_event(ev(venueName=""), now=NOW)
    assert validate_event(ev(address="a" * 301), now=NOW)


def test_datas():
    assert validate_event(ev(startAt="nao-e-data"), now=NOW)
    assert validate_event(ev(startAt=None), now=NOW)
    # ja passou (mais de 1 dia antes de agora)
    assert validate_event(ev(startAt="2026-07-20T20:00:00+00:00", endAt=None), now=NOW)
    # fim antes do inicio
    assert validate_event(ev(endAt="2026-08-22T20:00:00+00:00"), now=NOW)


def test_preco_fora_da_faixa_ou_desconhecido():
    assert validate_event(ev(price=-1), now=NOW)
    assert validate_event(ev(price=100_001), now=NOW)
    assert validate_event(ev(priceUnknown=True), now=NOW)
    assert validate_event(ev(price=None), now=NOW) == []  # gratuito


# ── freio de emergencia ───────────────────────────────────────────────────────

def test_freio_de_emergencia():
    assert should_abort(total=10, invalid=4) is True    # 40%
    assert should_abort(total=10, invalid=3) is False   # 30% ainda passa
    assert should_abort(total=4, invalid=4) is False    # poucos eventos: nao decide
    assert should_abort(total=0, invalid=0) is False
