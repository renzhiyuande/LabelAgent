#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${LABELHUB_RUNTIME_DIR:-${TMPDIR:-/tmp}/labelhub-local-stack}"
LOG_DIR="${RUNTIME_DIR}/logs"
mkdir -p "${LOG_DIR}"

BACKEND_PORT="${LABELHUB_BACKEND_PORT:-8080}"
AGENT_PORT="${LABELHUB_AGENT_PORT:-8000}"
FRONTEND_PORT="${LABELHUB_FRONTEND_PORT:-5173}"
BOARD_PORT="${LABELHUB_BOARD_PORT:-3001}"
DOCKER_START_TIMEOUT="${LABELHUB_DOCKER_START_TIMEOUT:-120}"

INFRA_PROJECT_NAME="${LABELHUB_INFRA_PROJECT_NAME:-labelhub-local}"
MYSQL_URL_DEFAULT="jdbc:mysql://127.0.0.1:3306/labelhub?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&rewriteBatchedStatements=true&allowPublicKeyRetrieval=true&useSSL=false"
MYSQL_URL="${LABELHUB_DATASOURCE_URL:-${MYSQL_URL_DEFAULT}}"
MYSQL_USERNAME_OVERRIDE="${LABELHUB_DATASOURCE_USERNAME:-}"
MYSQL_PASSWORD_OVERRIDE="${LABELHUB_DATASOURCE_PASSWORD:-}"
MYSQL_ROOT_PASSWORD="${LABELHUB_MYSQL_ROOT_PASSWORD:-}"
MINIO_ENDPOINT="${LABELHUB_MINIO_ENDPOINT:-http://127.0.0.1:9000}"
MINIO_ACCESS_KEY="${LABELHUB_MINIO_ACCESS_KEY:-}"
MINIO_SECRET_KEY="${LABELHUB_MINIO_SECRET_KEY:-}"
MINIO_BUCKET="${LABELHUB_MINIO_BUCKET:-labelhub}"
INTERNAL_TOKEN="${LABELHUB_INTERNAL_TOKEN:-}"
AES_KEY="${LABELHUB_AES_KEY:-}"
VITE_PROXY_TARGET="${VITE_PROXY_TARGET:-http://127.0.0.1:${BACKEND_PORT}}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
AGENT_ENV_FILE="${LABELHUB_AGENT_ENV_FILE:-${ROOT_DIR}/agent/.env}"

usage() {
  cat <<EOF
Usage: $(basename "$0")

Starts the local LabelHub delivery stack:
  - MySQL / Redis / MinIO via docker compose
  - backend on :${BACKEND_PORT}
  - agent on :${AGENT_PORT}
  - frontend on :${FRONTEND_PORT}
  - delivery board on :${BOARD_PORT}

Overrides:
  LABELHUB_BACKEND_PORT
  LABELHUB_AGENT_PORT
  LABELHUB_FRONTEND_PORT
  LABELHUB_BOARD_PORT
  LABELHUB_RUNTIME_DIR
  LABELHUB_AGENT_ENV_FILE
  LABELHUB_DOCKER_START_TIMEOUT
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_value() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "[error] ${name} must be set before starting the local delivery stack." >&2
    exit 1
  fi
}

need_cmd docker
need_cmd mvn
need_cmd java
need_cmd pnpm
need_cmd python3
need_cmd curl
need_cmd nohup

docker_daemon_available() {
  docker info >/dev/null 2>&1
}

wait_for_docker_daemon() {
  local timeout="${1:-120}"
  local start_ts
  start_ts="$(date +%s)"
  while true; do
    if docker_daemon_available; then
      echo "[ok] docker daemon is ready"
      return 0
    fi
    if (( "$(date +%s)" - start_ts >= timeout )); then
      return 1
    fi
    sleep 3
  done
}

ensure_docker_daemon() {
  if docker_daemon_available; then
    return 0
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && command -v open >/dev/null 2>&1 && [[ -d "/Applications/Docker.app" ]]; then
    echo "[step] docker daemon unavailable; attempting to launch Docker Desktop"
    open -ga Docker >/dev/null 2>&1 || true
    if wait_for_docker_daemon "${DOCKER_START_TIMEOUT}"; then
      return 0
    fi
    echo "[warn] Docker Desktop was launched but daemon did not become ready within ${DOCKER_START_TIMEOUT}s" >&2
  fi

  return 1
}

runtime_file() {
  echo "${RUNTIME_DIR}/$1"
}

pid_file() {
  echo "${RUNTIME_DIR}/$1.pid"
}

log_file() {
  echo "${LOG_DIR}/$1.log"
}

is_pid_running() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  local pid
  pid="$(cat "$file")"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" >/dev/null 2>&1
}

is_tcp_open() {
  python3 - "$1" "$2" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(1.0)
try:
    sock.connect((host, port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local timeout="${3:-180}"
  local start_ts
  start_ts="$(date +%s)"
  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[ok] ${name} -> ${url}"
      return 0
    fi
    if (( "$(date +%s)" - start_ts >= timeout )); then
      echo "[error] timed out waiting for ${name} -> ${url}" >&2
      return 1
    fi
    sleep 2
  done
}

ensure_agent_venv() {
  if [[ ! -x "${ROOT_DIR}/agent/.venv/bin/python" ]]; then
    (
      cd "${ROOT_DIR}/agent"
      python3 -m venv .venv
      .venv/bin/pip install -r requirements.txt
    )
  fi
}

stop_pid_quiet() {
  local name="$1"
  local pidfile
  pidfile="$(pid_file "$name")"
  if ! is_pid_running "$pidfile"; then
    rm -f "$pidfile"
    return 0
  fi
  local pid
  pid="$(cat "$pidfile")"
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
  rm -f "$pidfile"
}

start_background() {
  local name="$1"
  local cwd="$2"
  shift 2
  local pidfile
  pidfile="$(pid_file "$name")"
  local logfile
  logfile="$(log_file "$name")"

  if is_pid_running "$pidfile"; then
    echo "[skip] ${name} already running (pid $(cat "$pidfile"))"
    return 0
  fi

  rm -f "$pidfile"
  (
    cd "$cwd"
    nohup "$@" >"$logfile" 2>&1 &
    echo $! >"$pidfile"
  )
  echo "[start] ${name} (pid $(cat "$pidfile"))"
}

backend_credential_candidates() {
  require_value "LABELHUB_DATASOURCE_USERNAME" "$MYSQL_USERNAME_OVERRIDE"
  require_value "LABELHUB_DATASOURCE_PASSWORD" "$MYSQL_PASSWORD_OVERRIDE"
  printf '%s:%s\n' "$MYSQL_USERNAME_OVERRIDE" "$MYSQL_PASSWORD_OVERRIDE"
}

start_backend_with_fallbacks() {
  local attempt=0
  while IFS=: read -r username password; do
    [[ -n "$username" ]] || continue
    attempt=$((attempt + 1))
    echo "[step] starting backend attempt ${attempt} with datasource user ${username}"
    stop_pid_quiet "backend"
    (
      cd "${ROOT_DIR}/backend"
      env LABELHUB_DATASOURCE_URL="${MYSQL_URL}" \
          LABELHUB_DATASOURCE_USERNAME="${username}" \
          LABELHUB_DATASOURCE_PASSWORD="${password}" \
          LABELHUB_INTERNAL_TOKEN="${INTERNAL_TOKEN}" \
          LABELHUB_AES_KEY="${AES_KEY}" \
          LABELHUB_AGENT_BASE_URL="http://127.0.0.1:${AGENT_PORT}" \
          LABELHUB_MINIO_ENDPOINT="${MINIO_ENDPOINT}" \
          LABELHUB_MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY}" \
          LABELHUB_MINIO_SECRET_KEY="${MINIO_SECRET_KEY}" \
          LABELHUB_MINIO_BUCKET="${MINIO_BUCKET}" \
          mvn -pl host-app -am -DskipTests install >/dev/null
    )
    start_background "backend" "${ROOT_DIR}/backend" \
      env SPRING_PROFILES_ACTIVE=dev \
          LABELHUB_DATASOURCE_URL="${MYSQL_URL}" \
          LABELHUB_DATASOURCE_USERNAME="${username}" \
          LABELHUB_DATASOURCE_PASSWORD="${password}" \
          LABELHUB_INTERNAL_TOKEN="${INTERNAL_TOKEN}" \
          LABELHUB_AES_KEY="${AES_KEY}" \
          LABELHUB_AGENT_BASE_URL="http://127.0.0.1:${AGENT_PORT}" \
          LABELHUB_MINIO_ENDPOINT="${MINIO_ENDPOINT}" \
          LABELHUB_MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY}" \
          LABELHUB_MINIO_SECRET_KEY="${MINIO_SECRET_KEY}" \
          LABELHUB_MINIO_BUCKET="${MINIO_BUCKET}" \
          java -jar "${ROOT_DIR}/backend/host-app/target/host-app-0.1.0-SNAPSHOT.jar" \
          --server.port="${BACKEND_PORT}"

    if wait_for_url "backend" "http://127.0.0.1:${BACKEND_PORT}/actuator/health" 90; then
      printf '%s\n' "${username}" >"$(runtime_file backend.datasource.username)"
      return 0
    fi

    echo "[warn] backend attempt ${attempt} did not become healthy; retrying with next datasource candidate"
    stop_pid_quiet "backend"
  done < <(backend_credential_candidates)

  echo "[error] backend failed to become healthy with all datasource credential candidates" >&2
  return 1
}

if is_tcp_open 127.0.0.1 3306 && is_tcp_open 127.0.0.1 6379 && is_tcp_open 127.0.0.1 9000; then
  echo "[step] reusing existing local infra on 3306/6379/9000"
  printf 'external\n' >"$(runtime_file infra.mode)"
else
  require_value "LABELHUB_MYSQL_ROOT_PASSWORD" "$MYSQL_ROOT_PASSWORD"
  require_value "LABELHUB_MINIO_ACCESS_KEY" "$MINIO_ACCESS_KEY"
  require_value "LABELHUB_MINIO_SECRET_KEY" "$MINIO_SECRET_KEY"
  if ! ensure_docker_daemon; then
    echo "[error] Docker daemon is not reachable, and no reusable local infra was found on 3306/6379/9000." >&2
    echo "[hint] Start Docker Desktop (or another Docker daemon), or manually provide MySQL/Redis/MinIO on the default local ports before rerunning." >&2
    exit 1
  fi
  echo "[step] starting compose infrastructure"
  (
    cd "${ROOT_DIR}"
    COMPOSE_PROJECT_NAME="${INFRA_PROJECT_NAME}" docker compose up -d mysql redis minio
  )
  printf 'compose\n' >"$(runtime_file infra.mode)"
fi

require_value "LABELHUB_INTERNAL_TOKEN" "$INTERNAL_TOKEN"
require_value "LABELHUB_AES_KEY" "$AES_KEY"

echo "[step] ensuring agent virtualenv"
ensure_agent_venv

echo "[step] starting agent"
start_background "agent" "${ROOT_DIR}/agent" \
  env LABELHUB_INTERNAL_TOKEN="${INTERNAL_TOKEN}" \
      LABELHUB_AGENT_PORT="${AGENT_PORT}" \
      bash -lc "set -a; source '${AGENT_ENV_FILE}'; set +a; exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port '${AGENT_PORT}'"

start_backend_with_fallbacks

echo "[step] starting frontend"
if [[ -n "${VITE_API_BASE_URL}" ]]; then
  start_background "frontend" "${ROOT_DIR}/frontend" \
    env VITE_PROXY_TARGET="${VITE_PROXY_TARGET}" \
        VITE_API_BASE_URL="${VITE_API_BASE_URL}" \
        pnpm dev -- --host 127.0.0.1 --port "${FRONTEND_PORT}"
else
  start_background "frontend" "${ROOT_DIR}/frontend" \
    env VITE_PROXY_TARGET="${VITE_PROXY_TARGET}" \
        pnpm dev -- --host 127.0.0.1 --port "${FRONTEND_PORT}"
fi

echo "[step] starting delivery board"
start_background "board" "${ROOT_DIR}" \
  env PORT="${BOARD_PORT}" node "${ROOT_DIR}/project-work/contest-delivery-ops/board/server.js"

echo "[step] waiting for services"
wait_for_url "agent" "http://127.0.0.1:${AGENT_PORT}/health" 180
wait_for_url "frontend" "http://127.0.0.1:${FRONTEND_PORT}" 180
wait_for_url "delivery-board" "http://127.0.0.1:${BOARD_PORT}/api/board" 120

cat <<EOF

LabelHub local delivery stack is up.
  backend : http://127.0.0.1:${BACKEND_PORT}
  agent   : http://127.0.0.1:${AGENT_PORT}
  frontend: http://127.0.0.1:${FRONTEND_PORT}
  board   : http://127.0.0.1:${BOARD_PORT}

Logs:
  ${LOG_DIR}/backend.log
  ${LOG_DIR}/agent.log
  ${LOG_DIR}/frontend.log
  ${LOG_DIR}/board.log
EOF
