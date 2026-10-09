#!/usr/bin/env bash
# ==============================================================================
# LynxShare - Modo Portable (Ejecución directa sin instalar)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -x "$SCRIPT_DIR/venv/bin/python3" ]; then
  exec "$SCRIPT_DIR/venv/bin/python3" "$SCRIPT_DIR/lynxshare.py" "$@"
else
  exec python3 "$SCRIPT_DIR/lynxshare.py" "$@"
fi
