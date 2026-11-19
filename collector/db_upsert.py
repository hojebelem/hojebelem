"""
Upsert de eventos no banco PostgreSQL do hojebelem.

Insere um novo evento ou atualiza se ja existir (dedupe por externalId).
Tambem relaciona o evento com sua categoria em EventCategory.
"""
import logging

import psycopg2
from psycopg2 import sql

logger = logging.getLogger("collector")


def load_category_map(conn) -> dict[str, str]:
    """Carrega mapa {nome_lowercase: id} de categorias do banco."""
    cur = conn.cursor()
    try:
        cur.execute('SELECT id, LOWER(name) FROM "Category"')
        return {name_lower: cat_id for cat_id, name_lower in cur.fetchall()}
    finally:
        cur.close()


def record_collector_run(
    conn,
    source: str,
    started_at,
    status: str,
    fetched_count: int = 0,
    upserted_count: int = 0,
    invalid_count: int = 0,
    error_message: str | None = None,
) -> bool:
    """Registra uma execucao do coletor em CollectorRun (sem derrubar o processo em erro)."""
    cur = None
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO "CollectorRun" (
                id, source, "startedAt", "finishedAt", status,
                "fetchedCount", "upsertedCount", "invalidCount", "errorMessage"
            )
            VALUES (
                gen_random_uuid(), %s, %s, NOW(), %s,
                %s, %s, %s, %s
            )
            """,
            (
                source,
                started_at,
                status,
                fetched_count,
                upserted_count,
                invalid_count,
                error_message[:500] if error_message else None,
            ),
        )
        conn.commit()
        return True
    except Exception:
        logger.exception("falha ao gravar CollectorRun para %s", source)
        try:
            conn.rollback()
        except Exception:
            pass
        return False
    finally:
        if cur:
            cur.close()


def upsert_event(db, event: dict, category_map: dict[str, str] | None = None) -> bool:
    """Insere/atualiza um evento e relaciona sua categoria.

    `db` pode ser a URL do banco (abre e fecha uma conexao) ou uma conexao
    ja aberta, reaproveitada pela coleta inteira.
    """

    if not event.get("externalId"):
        return False

    payload = {"latitude": None, "longitude": None, **event}
    own_conn = isinstance(db, str)
    conn = None
    cur = None

    try:
        conn = psycopg2.connect(db) if own_conn else db
        cur = conn.cursor()

        # 1. Insere ou atualiza o evento.
        cur.execute(
            sql.SQL("""
                INSERT INTO "Event" (
                    id, title, slug, "externalId", source,
                    "startAt", "endAt", "venueName", address,
                    latitude, longitude,
                    "externalPurchaseLink", "coverImageUrl", price,
                    description, "isPublished", "cityId", "createdById",
                    "createdAt", "updatedAt"
                )
                VALUES (
                    gen_random_uuid(), %(title)s, %(slug)s,
                    %(externalId)s, %(source)s,
                    %(startAt)s, %(endAt)s, %(venueName)s, %(address)s,
                    %(latitude)s, %(longitude)s,
                    %(externalPurchaseLink)s, %(coverImageUrl)s,
                    %(price)s, %(description)s, %(isPublished)s,
                    %(cityId)s, %(createdById)s, NOW(), NOW()
                )
                ON CONFLICT ("externalId") DO UPDATE SET
                    -- data, preco e link sempre acompanham a Sympla
                    "startAt" = EXCLUDED."startAt",
                    "endAt" = EXCLUDED."endAt",
                    "externalPurchaseLink" = EXCLUDED."externalPurchaseLink",
                    price = EXCLUDED.price,
                    -- textos, localizacao e capa: depois que o admin revisou, ficam como ele deixou
                    title = CASE WHEN "Event"."reviewedAt" IS NULL
                        THEN EXCLUDED.title ELSE "Event".title END,
                    "venueName" = CASE WHEN "Event"."reviewedAt" IS NULL
                        THEN EXCLUDED."venueName" ELSE "Event"."venueName" END,
                    address = CASE WHEN "Event"."reviewedAt" IS NULL
                        THEN EXCLUDED.address ELSE "Event".address END,
                    latitude = CASE WHEN "Event"."reviewedAt" IS NULL
                        THEN EXCLUDED.latitude ELSE "Event".latitude END,
                    longitude = CASE WHEN "Event"."reviewedAt" IS NULL
                        THEN EXCLUDED.longitude ELSE "Event".longitude END,
                    "coverImageUrl" = CASE WHEN "Event"."reviewedAt" IS NULL
                        THEN EXCLUDED."coverImageUrl" ELSE "Event"."coverImageUrl" END,
                    description = CASE WHEN "Event"."reviewedAt" IS NULL
                        THEN EXCLUDED.description ELSE "Event".description END,
                    "updatedAt" = NOW()
                RETURNING id, "reviewedAt"
            """),
            payload,
        )

        event_id, reviewed_at = cur.fetchone()

        # 2. Busca a categoria pelo nome (evento ja revisado mantem a do admin).
        category_name = event.get("categoryName")

        if category_name and reviewed_at is None:
            category_id = None
            if category_map is not None:
                category_id = category_map.get(category_name.lower())
            else:
                cur.execute(
                    """
                    SELECT id
                    FROM "Category"
                    WHERE LOWER(name) = LOWER(%s)
                    LIMIT 1
                    """,
                    (category_name,),
                )
                category_row = cur.fetchone()
                category_id = category_row[0] if category_row else None

            if category_id:
                # 3. Remove categorias anteriores deste evento.
                cur.execute(
                    """
                    DELETE FROM "EventCategory"
                    WHERE "eventId" = %s
                    """,
                    (event_id,),
                )

                # 4. Relaciona o evento com a nova categoria.
                cur.execute(
                    """
                    INSERT INTO "EventCategory" ("eventId", "categoryId")
                    VALUES (%s, %s)
                    ON CONFLICT ("eventId", "categoryId") DO NOTHING
                    """,
                    (event_id, category_id),
                )

        conn.commit()

        return True

    except Exception:
        logger.exception("falha no upsert de %s", event.get("externalId"))
        if conn:
            conn.rollback()
        return False

    finally:
        if cur:
            cur.close()
        if conn and own_conn:
            conn.close()
