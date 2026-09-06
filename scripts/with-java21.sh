#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $(basename "$0") <command> [args...]" >&2
  exit 1
fi

resolve_java21_home() {
  if [[ -n "${JAVA_HOME_21:-}" && -x "${JAVA_HOME_21}/bin/java" ]]; then
    printf '%s\n' "${JAVA_HOME_21}"
    return 0
  fi

  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    local version
    version="$("${JAVA_HOME}/bin/java" -version 2>&1 | head -n 1 || true)"
    if [[ "${version}" == *'"21.'* || "${version}" == *' 21.'* ]]; then
      printf '%s\n' "${JAVA_HOME}"
      return 0
    fi
  fi

  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    local detected
    detected="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
    if [[ -n "${detected}" && -x "${detected}/bin/java" ]]; then
      printf '%s\n' "${detected}"
      return 0
    fi
  fi

  for candidate in \
    "/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"; do
    if [[ -x "${candidate}/bin/java" ]]; then
      local version
      version="$("${candidate}/bin/java" -version 2>&1 | head -n 1 || true)"
      if [[ "${version}" == *'"21.'* || "${version}" == *' 21.'* ]]; then
        printf '%s\n' "${candidate}"
        return 0
      fi
    fi
  done

  return 1
}

JAVA21_HOME="$(resolve_java21_home || true)"
if [[ -z "${JAVA21_HOME}" ]]; then
  cat >&2 <<'EOF'
Unable to locate a usable JDK 21 installation.
Set JAVA_HOME_21 explicitly, for example:
  export JAVA_HOME_21=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
EOF
  exit 1
fi

export JAVA_HOME="${JAVA21_HOME}"
export PATH="${JAVA_HOME}/bin:${PATH}"

exec "$@"
