#!/usr/bin/env bash
# ==============================================================================
# LynxShare - Modo Portable (Ejecución directa sin instalar)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/lynxshare.py" "$@"
