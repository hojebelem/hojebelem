"""
Testes para o upsert de eventos no Postgres.
"""
import os, pytest
try:
    from collector.db_upsert import upsert_event
except ImportError:
    upsert_event = None

DB_URL = os.environ.get("DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/hojebelem")

EVENT = {
    "title": "Test Event", "slug": "test-event-999",
    "externalId": "test-999", "source": "sympla",
    "startAt": "2026-12-01T20:00:00+00:00", "venueName": "Test Venue",
    "address": "Rua Teste 123", "externalPurchaseLink": "https://sympla.com.br/test",
    "coverImageUrl": "/uploads/test.jpg", "description": "Test description",
    "cityId": "cmsy3kuy30000ob55w5dibt8t", "createdById": "cmsy3kvcb0001ob5530um4zg8", "isPublished": True,
    "endAt": None, "latitude": None, "longitude": None, "price": None
}

@pytest.mark.skipif(upsert_event is None, reason="upsert nao implementado")
def test_upsert_new_event():
    result = upsert_event(DB_URL, EVENT)
    assert result is True

@pytest.mark.skipif(upsert_event is None, reason="upsert nao implementado")
def test_revisado_mantem_textos_do_admin():
    """Depois que o admin revisa, a coleta so muda data, preco e link."""
    import psycopg2
    try:
        conn = psycopg2.connect(DB_URL)
    except psycopg2.OperationalError:
        pytest.skip("banco local indisponivel")
    cur = conn.cursor()
    cur.execute('SELECT id FROM "City" WHERE slug = %s', ("belem",))
    city_id = cur.fetchone()[0]
    cur.execute('SELECT id FROM "User" WHERE role = %s LIMIT 1', ("ADMIN",))
    admin_id = cur.fetchone()[0]
    ext = "test-review-1"
    ev = {**EVENT, "externalId": ext, "slug": ext, "cityId": city_id,
          "createdById": admin_id, "isPublished": False}
    try:
        assert upsert_event(conn, ev) is True
        cur.execute('UPDATE "Event" SET title = %s, "reviewedAt" = NOW() '
                    'WHERE "externalId" = %s', ("Titulo do admin", ext))
        conn.commit()

        assert upsert_event(conn, {**ev, "title": "Titulo da Sympla",
                                   "price": 99, "isPublished": True}) is True
        cur.execute('SELECT title, price, "isPublished" FROM "Event" '
                    'WHERE "externalId" = %s', (ext,))
        title, price, published = cur.fetchone()
        assert title == "Titulo do admin"
        assert float(price) == 99
        assert published is False
    finally:
        cur.execute('DELETE FROM "Event" WHERE "externalId" = %s', (ext,))
        conn.commit()
        conn.close()

@pytest.mark.skipif(upsert_event is None, reason="upsert nao implementado")
def test_upsert_duplicate():
    """Mesmo externalId deve fazer update, nao inserir duplicata."""
    result = upsert_event(DB_URL, EVENT)
    assert result is True  # update bem-sucedido
