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
import time
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

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
    """Multi-threaded handler that cleanly routes root and assets without ugly redirects."""
    
    def translate_path(self, path):
        clean_path = path.split('?', 1)[0].split('#', 1)[0]
        
        # Route root & UI core files
        if clean_path in ('/', '/index.html'):
            return str(UI_DIR / "index.html")
        elif clean_path == '/style.css':
            return str(UI_DIR / "style.css")
        elif clean_path == '/app.js':
            return str(UI_DIR / "app.js")
        elif clean_path.startswith('/assets/'):
            rel = clean_path.replace('/assets/', '', 1)
            return str(ASSETS_DIR / rel)
        elif clean_path == '/favicon.ico':
            return str(ASSETS_DIR / "lynxshare.png")
        elif clean_path.startswith('/src/ui/'):
            rel = clean_path.replace('/src/ui/', '', 1)
            return str(UI_DIR / rel)
        elif clean_path.startswith('/src/assets/'):
            rel = clean_path.replace('/src/assets/', '', 1)
            return str(ASSETS_DIR / rel)
        
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        if os.environ.get("LYNXSHARE_DEBUG") == "1":
            super().log_message(format, *args)


def start_local_server(port):
    # Using ThreadingHTTPServer prevents blocking on keep-alive connections
    server = ThreadingHTTPServer(('127.0.0.1', port), LynxShareHandler)
    server.daemon_threads = True
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


def find_standalone_browser():
    """Finds available Chromium-based, Flatpak, or Epiphany browsers on Fedora."""
    # 1. Native binaries in PATH
    native_candidates = [
        ("brave-browser", ["--app={url}"]),
        ("brave", ["--app={url}"]),
        ("google-chrome-stable", ["--app={url}"]),
        ("google-chrome", ["--app={url}"]),
        ("chromium-browser", ["--app={url}"]),
        ("chromium", ["--app={url}"]),
        ("microsoft-edge-stable", ["--app={url}"]),
        ("microsoft-edge", ["--app={url}"]),
        ("opera", ["--app={url}"]),
        ("vivaldi", ["--app={url}"]),
        ("epiphany", ["--application-mode={url}"])
    ]
    for bin_name, args_template in native_candidates:
        path = shutil.which(bin_name)
        if path:
            return ([path], args_template)

    # 2. Flatpak browsers (very popular on Fedora GNOME)
    flatpak_bin = shutil.which("flatpak")
    if flatpak_bin:
        flatpak_candidates = [
            ("com.brave.Browser", ["--app={url}"]),
            ("com.google.Chrome", ["--app={url}"]),
            ("org.chromium.Chromium", ["--app={url}"]),
            ("com.microsoft.Edge", ["--app={url}"]),
            ("org.gnome.Epiphany", ["--application-mode={url}"])
        ]
        for app_id, args_template in flatpak_candidates:
            try:
                chk = subprocess.run([flatpak_bin, "info", app_id], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if chk.returncode == 0:
                    return ([flatpak_bin, "run", app_id], args_template)
            except Exception:
                pass

    return (None, None)


def launch_app_window(browser_cmd, args_template, app_url):
    profile_dir = CONFIG_DIR / "browser-profile"
    profile_dir.mkdir(parents=True, exist_ok=True)
    
    formatted_args = [a.format(url=app_url) for a in args_template]
    
    cmd = browser_cmd + formatted_args + [
        f"--user-data-dir={profile_dir.resolve()}",
        "--new-window",
        "--ozone-platform-hint=auto",
        "--enable-features=VaapiVideoDecodeLinuxGL,VaapiVideoDecoder,TouchpadOverscrollHistoryNavigation",
        "--enable-gpu-rasterization",
        "--enable-zero-copy",
        "--window-size=1320,860",
        "--class=lynxshare",
        "--name=lynxshare"
    ]
    
    print(f"[LynxShare] Iniciando ventana de aplicación: {' '.join(browser_cmd)}...")
    try:
        proc = subprocess.Popen(cmd)
        return proc
    except Exception as e:
        print(f"[LynxShare] Error lanzando navegador: {e}")
        return None


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
    app_url = f"http://127.0.0.1:{port}/"

    print("==================================================")
    print(f"  {APP_NAME} v{APP_VERSION} - Fedora Linux Edition")
    print(f"  Optimizado para Lenovo Yoga 7 2-in-1 (Lunar Lake)")
    print(f"  URL Local: {app_url}")
    print("==================================================")

    # 1. Try pywebview (Native GTK WebKit window)
    if not args.browser:
        if launch_pywebview(app_url):
            return

        # 2. Try standalone app window (Chromium / Flatpak / Epiphany)
        browser_cmd, args_template = find_standalone_browser()
        if browser_cmd:
            proc = launch_app_window(browser_cmd, args_template, app_url)
            if proc:
                # Wait briefly to check if it delegated to an already-running browser
                time.sleep(2.5)
                if proc.poll() is None:
                    # Process is still running as a dedicated window
                    try:
                        proc.wait()
                    except KeyboardInterrupt:
                        pass
                    return
                # If proc exited immediately, it delegated URL to existing browser session
                # Fall through to keep server alive!

    # 3. Fallback: Open in default browser & keep background server alive
    print("[LynxShare] Abriendo en tu navegador...")
    webbrowser.open(app_url)

    # Keep server running until user terminates
    print("[LynxShare] Servidor activo. Presiona Ctrl+C en cualquier momento para detenerlo.")
    try:
        while True:
            threading.Event().wait(1)
    except KeyboardInterrupt:
        print("\n[LynxShare] Cerrando servidor...")


if __name__ == "__main__":
    main()
