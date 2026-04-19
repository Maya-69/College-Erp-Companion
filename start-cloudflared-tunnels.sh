#!/usr/bin/env bash
set -euo pipefail

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Error: cloudflared is not installed or not in PATH."
  echo "Install it first, then run this script again."
  exit 1
fi

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$BASE_DIR/.cloudflared-logs"
mkdir -p "$LOG_DIR"

PORTS=(5000 5001 5173 8081)
NAMES=(erp-backend companion-backend web-frontend expo-metro)
PIDS=()

cleanup() {
  echo
  echo "Stopping all tunnels..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait >/dev/null 2>&1 || true
  echo "All tunnels stopped."
}

trap cleanup INT TERM EXIT

echo "Starting Cloudflare tunnels..."

for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  name="${NAMES[$i]}"
  log_file="$LOG_DIR/${name}.log"

  : > "$log_file"

  cloudflared tunnel \
    --url "http://localhost:${port}" \
    --protocol http2 \
    --edge-ip-version 4 \
    >"$log_file" 2>&1 &

  pid=$!
  PIDS+=("$pid")
  echo "- $name on port $port started (PID $pid)"
done

echo
echo "Waiting for tunnel URLs..."
echo

for i in "${!PORTS[@]}"; do
  name="${NAMES[$i]}"
  port="${PORTS[$i]}"
  log_file="$LOG_DIR/${name}.log"

  url=""
  for _ in {1..60}; do
    if [[ -f "$log_file" ]]; then
      url=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$log_file" | head -n 1 || true)
      if [[ -n "$url" ]]; then
        break
      fi
    fi
    sleep 1
  done

  if [[ -n "$url" ]]; then
    echo "$name (localhost:$port) -> $url"
  else
    echo "$name (localhost:$port) -> URL not detected yet"
    echo "  Check log: $log_file"
  fi
done

echo
echo "Logs are in: $LOG_DIR"
echo "Press Ctrl+C to stop all tunnels."
echo

while true; do
  sleep 2
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      echo "A tunnel process exited unexpectedly."
      exit 1
    fi
  done
done
