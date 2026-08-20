#!/usr/bin/env bash
#
# Deploy the app to Azure Container Apps (the live deployment).
#
# Why Container Apps rather than App Service:
#   App Service Free (F1) allows 60 CPU-minutes per day, and that allowance is
#   tracked per subscription *per region* -- not per plan, so deleting and
#   recreating a plan does not reset it. Container Apps has a permanent monthly
#   free grant (180k vCPU-seconds, 360k GiB-seconds, 2M requests) which a
#   scale-to-zero demo never approaches.
#
# Persistence:
#   The container is ephemeral, so SQLite lives on an Azure Files share mounted
#   at /app/data. A Standard LRS share under 1 GiB costs a few cents a month --
#   the only non-free component, and the reason data survives scale-to-zero.
#   Gunicorn runs a single worker: SQLite over SMB can deadlock with concurrent
#   writers, and WAL mode needs shared memory a network filesystem cannot give.
#
# The image is built locally (never on Azure) and pushed to GHCR. The repo is
# private, so the container app pulls with a read:packages-only token.
#
# Prerequisites: ~/.ghcr-pull-token holds a GitHub PAT with read:packages.
set -euo pipefail

RG="${AZ_RESOURCE_GROUP:-rg-wedding-planner}"
LOC="${AZ_LOCATION:-polandcentral}"
ENVNAME="${AZ_ENV:-cae-wedding-planner}"
APP="${AZ_APP:-ca-wedding-planner}"
SA="${AZ_STORAGE:-stwpmk222765}"
SHARE=wpdata
TAG="${1:-v2}"
IMAGE="ghcr.io/teo03/wedding-planner:$TAG"
BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"

echo "==> Building $IMAGE locally for linux/amd64 (never on Azure)"
cd "$BACKEND"
docker buildx build --platform linux/amd64 -f Dockerfile.prod -t "$IMAGE" --push .

echo "==> Rolling the container app onto $IMAGE"
az containerapp update --name "$APP" --resource-group "$RG" \
  --image "$IMAGE" --output none

FQDN=$(az containerapp show --name "$APP" --resource-group "$RG" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Live at https://$FQDN"
