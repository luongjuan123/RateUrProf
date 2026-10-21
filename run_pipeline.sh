#!/usr/bin/env bash
# ==============================================================================
# RateUrProfs Nationwide Academic Data Collection Pipeline Launcher
# ==============================================================================
# Target: Intel Core i5-13400F, 32GB RAM, RTX 3070, Ubuntu Linux
# Designed for continuous multi-hour / multi-day unattended execution.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

VENV_PYTHON="${SCRIPT_DIR}/.venv/bin/python"
SYSTEM_PYTHON="$(which python3)"

if [[ -f "${VENV_PYTHON}" ]]; then
    PYTHON_CMD="${VENV_PYTHON}"
elif [[ -n "${SYSTEM_PYTHON}" ]]; then
    PYTHON_CMD="${SYSTEM_PYTHON}"
else
    echo "[-] Error: Python 3 not found on system." >&2
    exit 1
fi

# Ensure log and data directories exist
mkdir -p "${SCRIPT_DIR}/logs" "${SCRIPT_DIR}/src/data"

echo "=============================================================================="
echo " RATEURPROFS NATIONWIDE DATA COLLECTION LAUNCHER"
echo "=============================================================================="
echo " Project Directory: ${SCRIPT_DIR}"
echo " Python Binary:     ${PYTHON_CMD}"
echo " Database Target:   ${SCRIPT_DIR}/src/data/rateprof.db"
echo " JSON Export:       ${SCRIPT_DIR}/src/data/verified_academic_data.json"
echo " Log Target:        ${SCRIPT_DIR}/logs/collection.log"
echo " Date & Time:       $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=============================================================================="

# Command routing
COMMAND="${1:-run}"

case "${COMMAND}" in
    run)
        shift || true
        echo "[*] Launching continuous collector (Ctrl+C to pause gracefully)..."
        exec "${PYTHON_CMD}" -m data_collection.main run --continuous "$@"
        ;;
    resume)
        shift || true
        echo "[*] Resuming collection from saved checkpoint..."
        exec "${PYTHON_CMD}" -m data_collection.main resume "$@"
        ;;
    status)
        shift || true
        exec "${PYTHON_CMD}" -m data_collection.main status "$@"
        ;;
    report)
        shift || true
        exec "${PYTHON_CMD}" -m data_collection.main report "$@"
        ;;
    retry-failed)
        shift || true
        exec "${PYTHON_CMD}" -m data_collection.main retry-failed "$@"
        ;;
    test)
        shift || true
        echo "[*] Running data_collection test suite..."
        exec "${PYTHON_CMD}" -m unittest discover -s data_collection/tests -v "$@"
        ;;
    *)
        echo "Usage: $0 {run|resume|status|report|retry-failed|test} [options]"
        echo ""
        echo "Examples:"
        echo "  $0 run              # Run continuous collection overnight"
        echo "  $0 resume           # Resume collection from checkpoint"
        echo "  $0 status           # Check live progress and memory without interrupting"
        echo "  $0 report           # View detailed coverage and gap report"
        echo "  $0 retry-failed     # Re-queue failed URLs"
        echo "  $0 test             # Run automated test suite"
        exit 1
        ;;
esac
