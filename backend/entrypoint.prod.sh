#!/bin/sh
# Production entrypoint for Azure Container Apps.
# SQLite lives in the (ephemeral) container filesystem; the idempotent seeds
# re-populate the demo catalog on every cold start, so no external DB or
# persistent volume is required.
set -e

DB_PATH="${SQLITE_DB_PATH:-/app/data/db.sqlite3}"
mkdir -p "$(dirname "$DB_PATH")"

python manage.py migrate --noinput
python manage.py seed_taxonomy
python manage.py seed_locations
python manage.py seed_demo

if [ -n "${DJANGO_SUPERUSER_USERNAME}" ]; then
  python manage.py createsuperuser --noinput 2>/dev/null || true
fi

exec gunicorn config.wsgi \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
