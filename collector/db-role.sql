-- Usuário do banco só para o coletor, com o mínimo que ele precisa.
-- Um bug no coletor não consegue apagar tabelas nem ler senhas de usuários.
--
-- Rode uma vez, DEPOIS das migrations (as tabelas precisam existir):
--   docker compose exec -T postgres psql -U postgres -d hojebelem < collector/db-role.sql
-- É seguro rodar de novo. Em produção, troque a senha (ALTER ROLE ... PASSWORD).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hojebelem_collector') THEN
    CREATE ROLE hojebelem_collector LOGIN PASSWORD 'collector_local';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE hojebelem TO hojebelem_collector;
GRANT USAGE ON SCHEMA public TO hojebelem_collector;

-- leitura: cidade, categorias e só id/papel/data dos usuários (nada de e-mail ou senha)
GRANT SELECT ON "City", "Category" TO hojebelem_collector;
GRANT SELECT (id, role, "createdAt") ON "User" TO hojebelem_collector;

-- escrita: só eventos e o vínculo evento-categoria; sem DELETE em eventos
GRANT SELECT, INSERT, UPDATE ON "Event" TO hojebelem_collector;
GRANT SELECT, INSERT, DELETE ON "EventCategory" TO hojebelem_collector;
