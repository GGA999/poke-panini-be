#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.local-db.yml"
DB_SERVICE="db"
DB_NAME="${LOCAL_POSTGRES_DB:-poke_panini}"
DB_USER="${LOCAL_POSTGRES_USER:-postgres}"

docker compose -f "$COMPOSE_FILE" up -d "$DB_SERVICE"

echo "Attendo PostgreSQL locale..."
for attempt in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "PostgreSQL locale non pronto dopo 30 secondi." >&2
    exit 1
  fi

  sleep 1
done

echo "Reset schema public..."
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -c "drop schema if exists public cascade; create schema public; grant all on schema public to postgres; grant all on schema public to public;"

echo "Applico migration..."
for migration in "$ROOT_DIR"/supabase/migrations/*.sql; do
  echo " - $(basename "$migration")"
  docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -f "/workspace/supabase/migrations/$(basename "$migration")"
done

echo "Carico seed..."
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -f /workspace/supabase/seed.sql

echo "Database locale pronto: postgres://postgres:postgres@127.0.0.1:54322/poke_panini"
