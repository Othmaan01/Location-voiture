#!/usr/bin/env bash
# Pose les secrets de l'API sur Fly a partir de .env.local (jamais affiches).
# Usage : scripts/fly-set-secrets.sh <app-fly>
set -euo pipefail
APP="${1:?nom de l app Fly requis}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a; . "$ROOT/.env.local"; set +a
FLY="${FLYCTL:-$HOME/.fly/bin/flyctl}"
"$FLY" secrets set --app "$APP" --stage \
  DATABASE_URL="$DATABASE_URL" \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  API_JWT_ISSUER="$API_JWT_ISSUER" \
  API_CORS_ORIGINS="${API_CORS_ORIGINS:-}" \
  API_PUBLIC_URL="https://$APP.fly.dev" \
  ${STRIPE_SECRET_KEY:+STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"} \
  ${STRIPE_WEBHOOK_SECRET:+STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"} >/dev/null
echo "secrets poses sur $APP (appliques au prochain deploiement)"
