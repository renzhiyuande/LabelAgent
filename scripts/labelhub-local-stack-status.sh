#!/usr/bin/env bash
set -euo pipefail

RUNTIME_DIR="${LABELHUB_RUNTIME_DIR:-${TMPDIR:-/tmp}/labelhub-local-stack}"
BACKEND_PORT="${LABELHUB_BACKEND_PORT:-8080}"
AGENT_PORT="${LABELHUB_AGENT_PORT:-8000}"
FRONTEND_PORT="${LABELHUB_FRONTEND_PORT:-5173}"
BOARD_PORT="${LABELHUB_BOARD_PORT:-3001}"

service_state() {
  local name="$1"
  local pidfile="${RUNTIME_DIR}/${name}.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "${name}: running (pid ${pid})"
      return
    fi
  fi
  echo "${name}: stopped"
}

http_state() {
  local name="$1"
  local url="$2"
  if curl -fsS "$url" >/dev/null 2>&1; then
    echo "${name}: healthy (${url})"
  else
    echo "${name}: unreachable (${url})"
  fi
}

service_state "agent"
service_state "backend"
service_state "frontend"
service_state "board"

echo "---"
http_state "agent" "http://127.0.0.1:${AGENT_PORT}/health"
http_state "backend" "http://127.0.0.1:${BACKEND_PORT}/actuator/health"
http_state "frontend" "http://127.0.0.1:${FRONTEND_PORT}"
http_state "board" "http://127.0.0.1:${BOARD_PORT}/api/board"
