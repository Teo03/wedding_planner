#!/usr/bin/env bash
# App Service (Linux) startup command for the Django backend.
#
# Dependencies are vendored into .python_packages/ at package time rather than
# installed here: App Service Free (F1) allows 60 CPU-minutes a day, and a
# single on-instance `pip install` of Django + Pillow + psycopg consumes the
# whole allowance, after which the platform stops the app. Shipping prebuilt
# linux/amd64 packages means startup costs almost no CPU.
#
# Data lives under /home, the App Service persistent share, so it survives
# restarts and redeploys and the seeds below are no-ops after the first boot.
set -e

APP_DIR="${APP_DIR:-/home/site/wwwroot}"
VENDORED="$APP_DIR/.python_packages/lib/site-packages"
if [ -d "$VENDORED" ]; then
  export PYTHONPATH="$VENDORED:${PYTHONPATH:-}"
fi

# Persistent, deploy-safe location for the SQLite DB and uploaded media.
mkdir -p /home/data /home/data/media

python manage.py migrate --noinput
python manage.py seed_taxonomy
python manage.py seed_locations
python manage.py seed_catalog --flush-demo

# Serve the admin/DRF/Swagger assets through WhiteNoise. Cheap and idempotent;
# the build step that would normally do this is deliberately switched off.
python manage.py collectstatic --noinput >/dev/null

# Create the admin user if credentials are configured (idempotent).
if [ -n "${DJANGO_SUPERUSER_USERNAME}" ]; then
  python manage.py createsuperuser --noinput 2>/dev/null || true
fi

# `python -m` rather than the bare binary: with the build disabled there is no
# virtualenv on PATH, only the vendored packages on PYTHONPATH.
# App Service injects PORT; default to 8000 for local parity.
exec python -m gunicorn config.wsgi \
  --bind=0.0.0.0:"${PORT:-8000}" \
  --workers 2 \
  --timeout 120
