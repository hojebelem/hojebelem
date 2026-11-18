"""
Classificador de eventos por palavras-chave.

Classifica cada evento em uma categoria correspondente às categorias cadastradas
no banco do hojebelem (`src/lib/catalog.ts`), baseado no nome do evento e organizador.
"""
import re


# Categorias: nome exato do banco -> lista de palavras-chave
CATEGORIES = {
    "Música ao vivo": [
        "show", "festival", "banda", "cantor", "tributo", "turnê",
        "rock", "sertanejo", "samba", "pagode", "eletrônica", "dj",
        "mpb", "funk", "gospel", "reggae", "forró", "jazz", "blues",
        "concerto", "orquestra", "micareta", "carnaval",
    ],
    "Stand-up/Comédia": ["stand-up", "standup", "comédia", "humor"],
    "Teatro": [
        "teatro", "peça", "drama", "monólogo", "musical", "palco", "performance",
    ],
    "Esportes": [
        "esporte", "esportes", "corrida", "maratona", "futebol", "campeonato",
        "crossfit", "jiu-jitsu", "luta", "mma",
    ],
    "Gastronomia": [
        "gastronomia", "comida", "chef", "degustação", "restaurante",
        "vinho", "cerveja", "churrasco", "bar", "food", "barbecue", "bbq",
    ],
    "Feiras e bazares": [
        "feira", "bazar", "exposição", "expo", "mostra", "artesanato",
        "negócios", "mercado", "design", "arte", "fotografia",
        "quadrinhos", "games", "geek", "livros", "automóveis",
    ],
    "Infantil": [
        "infantil", "criança", "crianças", "kids", "infância", "família",
        "bonecos", "mágica",
    ],
    "Palestras": [
        "palestra", "curso", "workshop", "webinar", "conferência",
        "treinamento", "seminário", "aulão", "congresso",
        "encontro", "imersão", "mentoria",
    ],
    "Festas": [
        "festa", "balada", "noite", "reveillon", "réveillon", "open bar",
        "after", "pool party", "sunset",
    ],
}

_CATEGORY_PATTERNS = [
    (
        category,
        re.compile(
            r"\b(?:" + "|".join(re.escape(kw) for kw in keywords) + r")\b",
            re.IGNORECASE,
        ),
    )
    for category, keywords in CATEGORIES.items()
]


def classify_event(title: str, organizer_name: str | None = None) -> str:
    """Classifica um evento baseado em palavras-chave no título e organizador.

    Returns:
        nome exato da categoria no banco — ex: "Música ao vivo" ou "Eventos culturais"
    """
    text = f"{title} {organizer_name or ''}".lower()
    text = re.sub(r"[^\w\s-]", " ", text)

    for category, pattern in _CATEGORY_PATTERNS:
        if pattern.search(text):
            return category
    return "Eventos culturais"
