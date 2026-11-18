"""
Testes para o classificador de eventos por palavras-chave.
"""
import pytest
try:
    from collector.classifier import classify_event
except ImportError:
    classify_event = None


@pytest.mark.skipif(classify_event is None, reason="classifier nao implementado")
def test_classify_music():
    cat = classify_event("Show do Djavan", "Djavan")
    assert cat == "Música ao vivo"


@pytest.mark.skipif(classify_event is None, reason="classifier nao implementado")
def test_classify_theater():
    cat = classify_event("Teatro: A Ultima Sessao de Freud", "")
    assert cat == "Teatro"


@pytest.mark.skipif(classify_event is None, reason="classifier nao implementado")
def test_classify_word_boundaries():
    # "bar" nao deve casar com "barato"; "arte" nao deve casar com "parte"
    cat = classify_event("Evento barato de parte tecnica", "")
    assert cat == "Eventos culturais"


@pytest.mark.skipif(classify_event is None, reason="classifier nao implementado")
def test_classify_unknown():
    cat = classify_event("Evento misterioso sem categoria", "")
    assert cat == "Eventos culturais"
