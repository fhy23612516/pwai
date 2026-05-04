#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pwai}"
ENV_DIR="${ENV_DIR:-/etc/pwai}"
SERVICE_PATH="${SERVICE_PATH:-/etc/systemd/system/pwai.service}"

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory not found: $APP_DIR" >&2
  exit 1
fi

sudo mkdir -p "$ENV_DIR"
if [[ ! -f "$ENV_DIR/pwai.env" ]]; then
  sudo cp "$APP_DIR/deploy/pwai.env.example" "$ENV_DIR/pwai.env"
fi

NODE_BIN="$(command -v node)"
sed "s#ExecStart=/usr/bin/node #ExecStart=$NODE_BIN #" "$APP_DIR/deploy/pwai.service" | sudo tee "$SERVICE_PATH" >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable pwai
sudo systemctl restart pwai
sudo systemctl status pwai --no-pager -l
