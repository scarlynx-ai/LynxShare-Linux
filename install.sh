#!/usr/bin/env bash
# ==============================================================================
# LynxShare - Instalador para Fedora Linux
# Dispositivo: Lenovo Yoga 7 2-in-1 (Intel Lunar Lake Core Ultra 7 258V)
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}      Instalador de LynxShare para Fedora Linux       ${NC}"
echo -e "${CYAN}   Optimizaciones: Lenovo Yoga 7 2-in-1 / Lunar Lake  ${NC}"
echo -e "${CYAN}======================================================${NC}"

# Detect if running as root or user
IS_ROOT=false
if [ "$EUID" -eq 0 ]; then
  IS_ROOT=true
fi

# Set installation paths
if [ "$IS_ROOT" = true ]; then
  INSTALL_DIR="/opt/lynxshare"
  BIN_DIR="/usr/local/bin"
  DESKTOP_DIR="/usr/share/applications"
  ICON_DIR="/usr/share/icons/hicolor/512x512/apps"
  echo -e "${GREEN}Modo de instalación: Sistema (/opt)${NC}"
else
  INSTALL_DIR="$HOME/.local/share/lynxshare"
  BIN_DIR="$HOME/.local/bin"
  DESKTOP_DIR="$HOME/.local/share/applications"
  ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
  echo -e "${GREEN}Modo de instalación: Usuario local ($HOME/.local)${NC}"
fi

# Detect Fedora
if [ -f /etc/fedora-release ]; then
  FEDORA_VER=$(cat /etc/fedora-release)
  echo -e "${GREEN}Sistema detectado: ${FEDORA_VER}${NC}"
else
  echo -e "${YELLOW}Aviso: No se detectó Fedora directamente, procediendo en modo Linux genérico...${NC}"
fi

# Check Python 3
if ! command -v python3 &> /dev/null; then
  echo -e "${RED}Error: Python 3 no está instalado. En Fedora ejecuta: sudo dnf install python3${NC}"
  exit 1
fi
echo -e "${GREEN}Python 3 verificado: $(python3 --version)${NC}"

# Check for optional packages (WebKit / pywebview / Chromium)
if command -v dnf &> /dev/null; then
  echo -e "${CYAN}Verificando aceleración por hardware de Intel Arc Lunar Lake...${NC}"
  # Check if intel media driver is installed for hardware decode
  if rpm -q intel-media-driver &> /dev/null; then
    echo -e "${GREEN}Driver de aceleración Intel VA-API detectado.${NC}"
  else
    echo -e "${YELLOW}Recomendado para decodificación de video 4K/8K por hardware en Yoga 7:${NC}"
    echo -e "${YELLOW}  sudo dnf install -y intel-media-driver libva-utils${NC}"
  fi

  # Check if python3-pywebview is available
  if ! python3 -c "import webview" &> /dev/null; then
    echo -e "${YELLOW}Recomendado para ventana nativa de escritorio independiente (sin pestañas):${NC}"
    echo -e "${YELLOW}  sudo dnf install -y python3-pywebview webkit2gtk4.1${NC}"
  fi
fi

# Create target directories
echo -e "${CYAN}Creando directorios...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# Source directory where install.sh is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy files
echo -e "${CYAN}Instalando archivos de la aplicación en $INSTALL_DIR...${NC}"
cp -r "$SCRIPT_DIR/lynxshare.py" "$INSTALL_DIR/"
cp -r "$SCRIPT_DIR/src" "$INSTALL_DIR/"
cp -r "$SCRIPT_DIR/assets" "$INSTALL_DIR/"

chmod +x "$INSTALL_DIR/lynxshare.py"

# Configure lightweight native desktop environment (pywebview + WebKitGTK)
echo -e "${CYAN}Configurando soporte para ventana nativa de escritorio...${NC}"
if python3 -m venv "$INSTALL_DIR/venv" --system-site-packages 2>/dev/null; then
  if "$INSTALL_DIR/venv/bin/pip" install pywebview --quiet 2>/dev/null; then
    echo -e "${GREEN}Soporte para ventana nativa WebKitGTK activado correctamente.${NC}"
  fi
fi

# Create launcher wrapper in BIN_DIR
LAUNCHER="$BIN_DIR/lynxshare"
echo -e "${CYAN}Creando ejecutable en $LAUNCHER...${NC}"
cat <<EOF > "$LAUNCHER"
#!/usr/bin/env bash
if [ -x "$INSTALL_DIR/venv/bin/python3" ]; then
  exec "$INSTALL_DIR/venv/bin/python3" "$INSTALL_DIR/lynxshare.py" "\$@"
else
  exec python3 "$INSTALL_DIR/lynxshare.py" "\$@"
fi
EOF
chmod +x "$LAUNCHER"

# Install Desktop Entry
echo -e "${CYAN}Instalando lanzador de escritorio y acceso directo...${NC}"
DESKTOP_FILE="$DESKTOP_DIR/lynxshare.desktop"
cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Version=1.0
Type=Application
Name=LynxShare
GenericName=Explorador Multimedia PC
Comment=Explorador de archivos, streaming de video inmersivo y gestor para servidores PC (Lenovo Yoga 7 Edition)
Exec=$LAUNCHER %U
Icon=lynxshare
Terminal=false
Categories=AudioVideo;Video;Player;Network;FileManager;Utility;
MimeType=video/mp4;video/x-matroska;video/webm;audio/mpeg;image/jpeg;image/png;
StartupWMClass=lynxshare
Keywords=lynxshare;pc;streaming;multimedia;share;yoga;fedora;
Actions=NewWindow;Config;

[Desktop Action NewWindow]
Name=Nueva Ventana
Exec=$LAUNCHER

[Desktop Action Config]
Name=Configurar Servidor PC
Exec=$LAUNCHER --browser
EOF
chmod +x "$DESKTOP_FILE"

# Install Icon
echo -e "${CYAN}Instalando icono en alta resolución...${NC}"
if [ -f "$SCRIPT_DIR/assets/lynxshare.png" ]; then
  cp "$SCRIPT_DIR/assets/lynxshare.png" "$ICON_DIR/lynxshare.png"
fi

# Update desktop & icon caches
if command -v update-desktop-database &> /dev/null; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi
if command -v gtk-update-icon-cache &> /dev/null; then
  gtk-update-icon-cache -f -t "$(dirname "$ICON_DIR")" 2>/dev/null || true
fi

# Ensure BIN_DIR is in PATH for user mode
if [ "$IS_ROOT" = false ]; then
  if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo -e "${YELLOW}Aviso: Agrega ~/.local/bin a tu PATH agregando 'export PATH=\"\$HOME/.local/bin:\$PATH\"' en ~/.bashrc${NC}"
  fi
fi

echo -e ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}      ¡LynxShare se instaló correctamente! 🎉        ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "Puedes abrir LynxShare desde:"
echo -e " 1. El menú de aplicaciones de Fedora / GNOME (busca 'LynxShare')."
echo -e " 2. O ejecutando el comando: ${CYAN}lynxshare${NC}"
echo -e ""
echo -e "Para desinstalar en cualquier momento ejecuta:"
echo -e " ${CYAN}$SCRIPT_DIR/uninstall.sh${NC}"
echo -e ""
