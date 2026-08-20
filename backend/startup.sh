#!/usr/bin/env bash
# App Service (Linux) startup command for the Django backend.
# Runs each time the container starts. Data lives under /home/data, which is
# the App Service persistent share, so migrations/seeds are effectively no-ops
# after the first boot.
set -e

# Persistent, deploy-safe location for the SQLite DB and uploaded media.
mkdir -p /home/data /home/data/media

python manage.py migrate --noinput
python manage.py seed_taxonomy
python manage.py seed_locations
python manage.py seed_demo

# Create the admin user if credentials are configured (idempotent).
if [ -n "${DJANGO_SUPERUSER_USERNAME}" ]; then
  python manage.py createsuperuser --noinput 2>/dev/null || true
fi

# App Service injects PORT; default to 8000 for local parity.
exec gunicorn config.wsgi \
  --bind=0.0.0.0:"${PORT:-8000}" \
  --workers 2 \
  --timeout 120
