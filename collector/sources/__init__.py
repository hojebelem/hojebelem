"""Registro das fontes de coleta ativas."""

from .sympla import collect as collect_sympla

SOURCES = {
    "sympla": collect_sympla,
}
