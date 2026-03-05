#!/usr/bin/env bash
# Usage: ./scripts/make-admin.sh your@email.com [ngrok-url]
#
# Requires DEV_SETUP_SECRET to be set in backend/.env
# The endpoint rejects requests without a matching x-dev-secret header.

set -euo pipefail

EMAIL="${1:-}"
BASE_URL="${2:-http://localhost:3001}"

if [ -z "$EMAIL" ]; then
  echo "Usage: $0 <email> [base-url]"
  echo "  e.g. $0 afaheem2003@gmail.com https://xxxx.ngrok-free.dev"
  exit 1
fi

# Load DEV_SETUP_SECRET from .env if not already in environment
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -z "${DEV_SETUP_SECRET:-}" ] && [ -f "$ENV_FILE" ]; then
  DEV_SETUP_SECRET=$(grep -E '^DEV_SETUP_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "${DEV_SETUP_SECRET:-}" ]; then
  echo "Error: DEV_SETUP_SECRET is not set in .env or environment."
  echo "Add it to backend/.env:  DEV_SETUP_SECRET=some-long-random-secret"
  exit 1
fi

echo "Granting PLATFORM_ADMIN to $EMAIL via $BASE_URL ..."

curl -sf -X POST "$BASE_URL/api/dev/setup" \
  -H "Content-Type: application/json" \
  -H "x-dev-secret: $DEV_SETUP_SECRET" \
  -d "{\"action\": \"make-platform-admin\", \"email\": \"$EMAIL\"}" \
  | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "Done — sign out and back in to refresh your session."
