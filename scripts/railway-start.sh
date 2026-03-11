#!/bin/sh
set -e

# API internal port; webapp uses $PORT (Railway)
API_PORT="${API_PORT:-3708}"

export NETWORKS_CONFIG_PATH="${NETWORKS_CONFIG_PATH:-/app/config/networks.json}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export LOG_HTTP_REQUESTS="${LOG_HTTP_REQUESTS:-false}"
export LOG_HTTP_RESPONSES="${LOG_HTTP_RESPONSES:-false}"
# ES_URL must be set (e.g. Railway Elasticsearch service URL)
if [ -z "$ES_URL" ]; then
  echo "ES_URL is required (e.g. your Elasticsearch service URL)"
  exit 1
fi

# Run API in background
cd /app/indyscan-api
PORT="$API_PORT" node src/index.js &
API_PID=$!

# Wait for API to listen
sleep 5

# Run webapp in foreground (so it receives PORT from Railway and signals)
cd /app/indyscan-webapp
export INDYSCAN_API_URL="http://127.0.0.1:$API_PORT"
exec node server/index.js
