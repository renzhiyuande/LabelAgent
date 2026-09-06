#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
export LANG=C

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE_URL="${LABELHUB_OPENAPI_BASE_URL:-${1:-http://127.0.0.1:8080}}"
TARGET_DIR="${LABELHUB_OPENAPI_TARGET_DIR:-${ROOT_DIR}/submission/api}"
AGENT_CONTRACT_SOURCE="${ROOT_DIR}/backend/docs/contracts/pyagent-ai-review.openapi.yaml"
PUBLIC_TARGET="${TARGET_DIR}/labelhub-openapi-public.json"
INTERNAL_TARGET="${TARGET_DIR}/labelhub-openapi-internal.json"
AGENT_TARGET="${TARGET_DIR}/pyagent-ai-review.openapi.yaml"
MANIFEST_TARGET="${TARGET_DIR}/EXPORT_MANIFEST.md"

usage() {
  cat <<EOF
Usage: $(basename "$0") [api-base-url]

Exports runtime OpenAPI artifacts from a running backend:
  public   -> ${PUBLIC_TARGET}
  internal -> ${INTERNAL_TARGET}
  agent    -> ${AGENT_TARGET}
  manifest -> ${MANIFEST_TARGET}
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

need_cmd curl
need_cmd jq
need_cmd shasum

mkdir -p "${TARGET_DIR}"

curl_json() {
  local url="$1"
  local target="$2"
  curl -fsS "$url" | jq '.' >"$target"
}

echo "[step] verifying backend health at ${API_BASE_URL}"
curl -fsS "${API_BASE_URL}/actuator/health" | jq '.data.status? // .status' >/dev/null

echo "[step] exporting public OpenAPI"
curl_json "${API_BASE_URL}/v3/api-docs/public" "${PUBLIC_TARGET}"

echo "[step] exporting internal OpenAPI"
curl_json "${API_BASE_URL}/v3/api-docs/internal" "${INTERNAL_TARGET}"

echo "[step] copying agent contract"
cp "${AGENT_CONTRACT_SOURCE}" "${AGENT_TARGET}"

PUBLIC_TITLE="$(jq -r '.info.title // "unknown"' "${PUBLIC_TARGET}")"
INTERNAL_TITLE="$(jq -r '.info.title // "unknown"' "${INTERNAL_TARGET}")"
PUBLIC_PATHS="$(jq '(.paths // {}) | length' "${PUBLIC_TARGET}")"
INTERNAL_PATHS="$(jq '(.paths // {}) | length' "${INTERNAL_TARGET}")"
PUBLIC_SHA="$(shasum -a 256 "${PUBLIC_TARGET}" | awk '{print $1}')"
INTERNAL_SHA="$(shasum -a 256 "${INTERNAL_TARGET}" | awk '{print $1}')"
AGENT_SHA="$(shasum -a 256 "${AGENT_TARGET}" | awk '{print $1}')"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat >"${MANIFEST_TARGET}" <<EOF
# OpenAPI Export Manifest

Generated At: ${GENERATED_AT}

Source Backend Base URL: \`${API_BASE_URL}\`

## Runtime Sources

- public: \`${API_BASE_URL}/v3/api-docs/public\`
- internal: \`${API_BASE_URL}/v3/api-docs/internal\`
- agent contract source: \`backend/docs/contracts/pyagent-ai-review.openapi.yaml\`

## Exported Files

| File | Type | Title / Source | Paths | SHA256 |
| --- | --- | --- | ---: | --- |
| \`labelhub-openapi-public.json\` | backend public | ${PUBLIC_TITLE} | ${PUBLIC_PATHS} | \`${PUBLIC_SHA}\` |
| \`labelhub-openapi-internal.json\` | backend internal | ${INTERNAL_TITLE} | ${INTERNAL_PATHS} | \`${INTERNAL_SHA}\` |
| \`pyagent-ai-review.openapi.yaml\` | agent contract | repository snapshot | - | \`${AGENT_SHA}\` |
EOF

echo "[ok] exported OpenAPI artifacts to ${TARGET_DIR}"
