#!/bin/sh
set -e

echo "Waiting for postgres at ${POSTGRES_HOST}:${POSTGRES_PORT} ..."
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres is up."

python manage.py migrate --noinput
python manage.py seed_taxonomy
python manage.py seed_locations
python manage.py seed_demo

if [ -n "${DJANGO_SUPERUSER_USERNAME}" ]; then
  python manage.py createsuperuser --noinput 2>/dev/null || true
fi

exec "$@"
