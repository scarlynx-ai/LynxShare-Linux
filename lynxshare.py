#!/usr/bin/env python3
"""
LynxShare - Linux Desktop Application
Tailored for Fedora Linux & Lenovo Yoga 7 2-in-1 (Intel Core Ultra 7 258V Lunar Lake)
"""

import sys
import os
import shutil
import socket
import argparse
import subprocess
import threading
import webbrowser
import json
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler

APP_NAME = "LynxShare"
APP_VERSION = "1.0.6"
DEFAULT_PC_SERVER = "http://192.168.31.219:8090"

# Paths
BASE_DIR = Path(__file__).resolve().parent
UI_DIR = BASE_DIR / "src" / "ui"
ASSETS_DIR = BASE_DIR / "assets"
CONFIG_DIR = Path.home() / ".config" / "lynxshare"
CONFIG_FILE = CONFIG_DIR / "config.json"


def load_config():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"server_url": DEFAULT_PC_SERVER}


def save_config(cfg):
    try:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"[LynxShare] Error al guardar config: {e}")


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class LynxShareHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self):
        # Redirect root to UI index.html
        if self.path == "/" or self.path == "":
            self.send_response(302)
            self.send_header("Location", "/src/ui/index.html")
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local UI assets
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        # Silent server logging unless debug is specified
        if os.environ.get("LYNXSHARE_DEBUG") == "1":
            super().log_message(format, *args)


def start_local_server(port):
    server = HTTPServer(('127.0.0.1', port), LynxShareHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def launch_pywebview(app_url):
    try:
        import webview
        print("[LynxShare] Iniciando interfaz nativa con WebKitGTK (pywebview)...")
        webview.create_window(
            title=f"LynxShare {APP_VERSION} - Explorador Multimedia",
            url=app_url,
            width=1320,
            height=860,
            min_size=(850, 600),
            background_color="#090c15",
            text_select=False
        )
        webview.start(gui="gtk", debug=bool(os.environ.get("LYNXSHARE_DEBUG") == "1"))
        return True
    except ImportError:
        return False
    except Exception as e:
        print(f"[LynxShare] WebKitGTK no disponible: {e}")
        return False


def find_chromium_app_browser():
    # Common browsers on Fedora
    candidates = [
        "google-chrome-stable",
        "google-chrome",
        "chromium-browser",
        "chromium",
        "brave-browser",
        "microsoft-edge-stable",
        "microsoft-edge"
    ]
    for cmd in candidates:
        path = shutil.which(cmd)
        if path:
            return path
    return None


def launch_app_window(browser_bin, app_url):
    profile_dir = CONFIG_DIR / "browser-profile"
    profile_dir.mkdir(parents=True, exist_ok=True)
    
    # Intel Lunar Lake (Arc 140V) GPU hardware acceleration & Wayland flags
    cmd = [
        browser_bin,
        f"--app={app_url}",
        f"--user-data-dir={profile_dir}",
        "--ozone-platform-hint=auto",
        "--enable-features=VaapiVideoDecodeLinuxGL,VaapiVideoDecoder,TouchpadOverscrollHistoryNavigation",
        "--enable-gpu-rasterization",
        "--enable-zero-copy",
        "--window-size=1320,860",
        "--class=lynxshare",
        "--name=lynxshare"
    ]
    print(f"[LynxShare] Lanzando app window con {browser_bin}...")
    try:
        proc = subprocess.Popen(cmd)
        proc.wait()
        return True
    except Exception as e:
        print(f"[LynxShare] Error lanzando navegador: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description=f"{APP_NAME} - Cliente Linux para servidor multimedia")
    parser.add_argument("--server", type=str, help="URL del servidor PC (ej: http://192.168.31.219:8090)")
    parser.add_argument("--port", type=int, default=None, help="Puerto local para UI")
    parser.add_argument("--browser", action="store_true", help="Abrir directamente en navegador predeterminado")
    parser.add_argument("--debug", action="store_true", help="Activar modo depuración")
    args = parser.parse_args()

    if args.debug:
        os.environ["LYNXSHARE_DEBUG"] = "1"

    cfg = load_config()
    if args.server:
        cfg["server_url"] = args.server
        save_config(cfg)

    port = args.port or find_free_port()
    start_local_server(port)
    app_url = f"http://127.0.0.1:{port}/src/ui/index.html"

    print("==================================================")
    print(f"  {APP_NAME} v{APP_VERSION} - Fedora Linux Edition")
    print(f"  Optimizado para Lenovo Yoga 7 2-in-1 (Lunar Lake)")
    print(f"  URL Local: {app_url}")
    print("==================================================")

    if not args.browser:
        # 1. Try pywebview (native GTK WebKit)
        if launch_pywebview(app_url):
            return

        # 2. Try Chromium-based browser in standalone app mode with Intel VA-API acceleration
        chromium_bin = find_chromium_app_browser()
        if chromium_bin and launch_app_window(chromium_bin, app_url):
            return

    # 3. Fallback to default browser
    print("[LynxShare] Abriendo en tu navegador predeterminado...")
    webbrowser.open(app_url)
    
    # Keep server alive
    try:
        while True:
            threading.Event().wait(1)
    except KeyboardInterrupt:
        print("\n[LynxShare] Cerrando servidor...")


if __name__ == "__main__":
    main()
