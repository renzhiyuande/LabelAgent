#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
JAVA21_WRAPPER="${ROOT_DIR}/scripts/with-java21.sh"

if [[ ! -x "${JAVA21_WRAPPER}" ]]; then
  echo "Missing executable helper: ${JAVA21_WRAPPER}" >&2
  exit 1
fi

MODE="${1:-all}"

run_cmd() {
  echo
  echo "[run] $*"
  (
    cd "${BACKEND_DIR}"
    "${JAVA21_WRAPPER}" "$@"
  )
}

case "${MODE}" in
  all)
    run_cmd mvn -pl host-infra -am \
      -Dtest=SubmissionWorkflowWhiteBoxTest#wbSub006_submitTransitionsBothStateMachinesAndEnqueuesAiReview,AiReviewOrchestratorTest#wbRev001_aiPassWritesRecordAndTransitions \
      -Dsurefire.failIfNoSpecifiedTests=false \
      test
    run_cmd mvn -pl host-app \
      -Dtest=CrossSystemLabelReviewWhiteBoxIT#wbXsys001_submitEnqueuesAiReviewAndTransitionsStatus+wbRev001_it_mockAiReviewWritesRecordAfterSubmit \
      -Dsurefire.failIfNoSpecifiedTests=false \
      test
    ;;
  whitebox)
    run_cmd mvn -pl host-infra -am \
      -Dtest=SubmissionWorkflowWhiteBoxTest#wbSub006_submitTransitionsBothStateMachinesAndEnqueuesAiReview,AiReviewOrchestratorTest#wbRev001_aiPassWritesRecordAndTransitions \
      -Dsurefire.failIfNoSpecifiedTests=false \
      test
    ;;
  cross-system)
    run_cmd mvn -pl host-app \
      -Dtest=CrossSystemLabelReviewWhiteBoxIT#wbXsys001_submitEnqueuesAiReviewAndTransitionsStatus+wbRev001_it_mockAiReviewWritesRecordAfterSubmit \
      -Dsurefire.failIfNoSpecifiedTests=false \
      test
    ;;
  *)
    cat >&2 <<'EOF'
Usage: scripts/verify-ai-prereview-whitebox.sh [all|whitebox|cross-system]

Requires:
  - Docker Desktop / docker daemon reachable by Testcontainers for cross-system mode
  - A local JDK 21 installation resolvable by scripts/with-java21.sh
EOF
    exit 1
    ;;
esac
