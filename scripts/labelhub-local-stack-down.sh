#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${LABELHUB_RUNTIME_DIR:-${TMPDIR:-/tmp}/labelhub-local-stack}"
INFRA_PROJECT_NAME="${LABELHUB_INFRA_PROJECT_NAME:-labelhub-local}"
STOP_INFRA="${LABELHUB_STOP_INFRA:-1}"
INFRA_MODE_FILE="${RUNTIME_DIR}/infra.mode"

usage() {
  cat <<EOF
Usage: $(basename "$0")

Stops backend / agent / frontend / board processes started by labelhub-local-stack-up.sh.
If LABELHUB_STOP_INFRA=1 (default), also stops mysql / redis / minio compose services.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

stop_pid() {
  local name="$1"
  local pidfile="${RUNTIME_DIR}/${name}.pid"
  if [[ ! -f "$pidfile" ]]; then
    echo "[skip] ${name} pid file missing"
    return 0
  fi
  local pid
  pid="$(cat "$pidfile")"
  if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    for _ in $(seq 1 20); do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    echo "[stop] ${name}"
  else
    echo "[skip] ${name} not running"
  fi
  rm -f "$pidfile"
}

stop_pid "board"
stop_pid "frontend"
stop_pid "backend"
stop_pid "agent"

if [[ "$STOP_INFRA" == "1" && -f "$INFRA_MODE_FILE" && "$(cat "$INFRA_MODE_FILE")" == "compose" ]]; then
  (
    cd "${ROOT_DIR}"
    COMPOSE_PROJECT_NAME="${INFRA_PROJECT_NAME}" docker compose stop mysql redis minio >/dev/null
  )
  echo "[stop] compose infra"
fi

rm -f "$INFRA_MODE_FILE"
