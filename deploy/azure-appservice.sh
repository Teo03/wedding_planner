#!/usr/bin/env bash
#
# Deploy the app to Azure App Service on the Free (F1) tier.
#
# Why it is built this way:
#   * F1 allows 60 CPU-minutes per day, enforced per App Service *plan*. Azure's
#     default flow runs `pip install` on the instance, and building Django +
#     Pillow + psycopg burns the entire daily allowance in one deploy, after
#     which the platform parks the app in QuotaExceeded until the next day.
#     So dependencies are built here, for linux/amd64, and shipped prebuilt in
#     .python_packages/ with the remote build switched off.
#   * The Postgres driver is dropped: this deployment runs on SQLite, stored on
#     /home, which is App Service's persistent share, so data survives restarts
#     and redeploys. That keeps the whole thing on free tiers with no database
#     server to pay for.
#
# Usage:  ./deploy/azure-appservice.sh [app-name]
set -euo pipefail

RG="${AZ_RESOURCE_GROUP:-rg-wedding-planner}"
LOC="${AZ_LOCATION:-polandcentral}"
PLAN="${AZ_PLAN:-asp-wedding-planner-free}"
APP="${1:-${AZ_APP:-}}"
BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"

if [ -z "$APP" ]; then
  echo "usage: $0 <app-name>   (globally unique)" >&2
  exit 2
fi

echo "==> Vendoring dependencies for linux/amd64"
cd "$BACKEND"
rm -rf .python_packages
# One source of truth for versions; psycopg is filtered out rather than
# maintained in a second requirements file that could drift. The filtering
# happens inside the container, where requirements.txt is mounted.
docker run --rm --platform linux/amd64 -v "$BACKEND":/app -w /app python:3.13-slim \
  sh -c "grep -v '^psycopg' requirements.txt > /tmp/req.txt && \
         pip install --quiet --target .python_packages/lib/site-packages -r /tmp/req.txt"

echo "==> Building deployment package"
rm -f /tmp/wp-deploy.zip
zip -r -q /tmp/wp-deploy.zip . \
  -x "*__pycache__*" "*.pyc" "*.pytest_cache*" "staticfiles/*" "mediafiles/*" \
     "*/tests/*" "seed_data/*.xlsx" "db.sqlite3" "Dockerfile*" "entrypoint*.sh" \
     ".venv/*" "*.log"
du -h /tmp/wp-deploy.zip

echo "==> Creating infrastructure (idempotent)"
az group create --name "$RG" --location "$LOC" --output none
az appservice plan create --name "$PLAN" --resource-group "$RG" --location "$LOC" \
  --is-linux --sku F1 --output none 2>/dev/null || true
az webapp create --name "$APP" --resource-group "$RG" --plan "$PLAN" \
  --runtime "PYTHON|3.13" --output none 2>/dev/null || true

HOST="${APP}.azurewebsites.net"
SECRET="${DJANGO_SECRET_KEY:-$(python3 -c 'import secrets;print(secrets.token_urlsafe(50))')}"
ADMIN_PW="${DJANGO_SUPERUSER_PASSWORD:-$(python3 -c 'import secrets;print(secrets.token_urlsafe(12))')}"

echo "==> Configuring $HOST"
az webapp config appsettings set --name "$APP" --resource-group "$RG" --settings \
  DJANGO_SECRET_KEY="$SECRET" \
  DJANGO_DEBUG=0 \
  DJANGO_ALLOWED_HOSTS="$HOST" \
  CSRF_TRUSTED_ORIGINS="https://$HOST" \
  DATABASE_URL="sqlite:////home/data/db.sqlite3" \
  DJANGO_MEDIA_ROOT="/home/data/media" \
  WHITENOISE_ROOT="/home/site/wwwroot/frontend_dist" \
  JWT_COOKIE_SECURE=1 \
  JWT_COOKIE_SAMESITE=Lax \
  DJANGO_SUPERUSER_USERNAME="${DJANGO_SUPERUSER_USERNAME:-admin}" \
  DJANGO_SUPERUSER_EMAIL="${DJANGO_SUPERUSER_EMAIL:-admin@example.com}" \
  DJANGO_SUPERUSER_PASSWORD="$ADMIN_PW" \
  SCM_DO_BUILD_DURING_DEPLOYMENT=0 \
  ENABLE_ORYX_BUILD=false \
  --output none

az webapp config set --name "$APP" --resource-group "$RG" \
  --startup-file "bash /home/site/wwwroot/startup.sh" --output none

echo "==> Deploying"
az webapp deploy --name "$APP" --resource-group "$RG" \
  --src-path /tmp/wp-deploy.zip --type zip --async true --output none

echo
echo "Deployed to https://$HOST"
echo "Admin login: ${DJANGO_SUPERUSER_USERNAME:-admin} / $ADMIN_PW"
