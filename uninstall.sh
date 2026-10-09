#!/usr/bin/env bash
# ==============================================================================
# LynxShare - Desinstalador
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Desinstalando LynxShare...${NC}"

# Check root or user paths
if [ "$EUID" -eq 0 ]; then
  INSTALL_DIR="/opt/lynxshare"
  BIN_DIR="/usr/local/bin"
  DESKTOP_DIR="/usr/share/applications"
  ICON_DIR="/usr/share/icons/hicolor/512x512/apps"
else
  INSTALL_DIR="$HOME/.local/share/lynxshare"
  BIN_DIR="$HOME/.local/bin"
  DESKTOP_DIR="$HOME/.local/share/applications"
  ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
fi

rm -rf "$INSTALL_DIR"
rm -f "$BIN_DIR/lynxshare"
rm -f "$DESKTOP_DIR/lynxshare.desktop"
rm -f "$ICON_DIR/lynxshare.png"

if command -v update-desktop-database &> /dev/null; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo -e "${GREEN}LynxShare ha sido desinstalado por completo.${NC}"
