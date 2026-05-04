#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pwai}"
NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available/pwai}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/pwai}"

if [[ ! -f "$APP_DIR/deploy/nginx-pwai.conf" ]]; then
  echo "Nginx template not found: $APP_DIR/deploy/nginx-pwai.conf" >&2
  exit 1
fi

sudo mkdir -p "$(dirname "$NGINX_AVAILABLE")" "$(dirname "$NGINX_ENABLED")"
sudo cp "$APP_DIR/deploy/nginx-pwai.conf" "$NGINX_AVAILABLE"
sudo ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
sudo nginx -t
sudo systemctl reload nginx
