#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pwai}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/conf.d/pwai.conf}"

if [[ ! -f "$APP_DIR/deploy/nginx-pwai.conf" ]]; then
  echo "Nginx template not found: $APP_DIR/deploy/nginx-pwai.conf" >&2
  exit 1
fi

sudo cp "$APP_DIR/deploy/nginx-pwai.conf" "$NGINX_CONF"
sudo nginx -t
sudo systemctl reload nginx
