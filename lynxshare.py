#!/usr/bin/env python3
"""
LynxShare - Linux Desktop Application
Tailored for Fedora Linux & Lenovo Yoga 7 2-in-1 (Intel Core Ultra 7 258V Lunar Lake)
Features:
- Built-in High-Speed Local Proxy for /api/* (Zero CORS, Zero Private Network Access blocking)
- Native WebKitGTK (pywebview) support
- Standalone Chromium / Brave / Chrome / Flatpak app window fallback
- Wayland native scaling & Intel Arc Lunar Lake VA-API hardware acceleration
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
import urllib.request
import urllib.error
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
    """Multi-threaded handler that serves local UI and proxies /api/ calls directly to the PC server."""
    
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

    def do_GET(self):
        clean_path = self.path.split('?', 1)[0].split('#', 1)[0]
        
        # Local config endpoint
        if clean_path == '/api/config':
            cfg = load_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode('utf-8'))
            return
            
        # Proxy other /api/ calls
        if clean_path.startswith('/api/'):
            self.proxy_request("GET")
            return
            
        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?', 1)[0].split('#', 1)[0]
        
        # Local config endpoint
        if clean_path == '/api/config':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length > 0 else b'{}'
            try:
                new_cfg = json.loads(body.decode('utf-8'))
                cfg = load_config()
                if "server_url" in new_cfg:
                    cfg["server_url"] = new_cfg["server_url"].rstrip("/")
                    save_config(cfg)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "server_url": cfg["server_url"]}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # Proxy other /api/ calls
        if clean_path.startswith('/api/'):
            self.proxy_request("POST")
            return
            
        self.send_error(405)

    def do_DELETE(self):
        clean_path = self.path.split('?', 1)[0].split('#', 1)[0]
        if clean_path.startswith('/api/'):
            self.proxy_request("DELETE")
            return
        self.send_error(405)

    def proxy_request(self, method):
        """Proxies HTTP calls directly to the PC server without browser CORS or network sandbox issues."""
        cfg = load_config()
        pc_server = cfg.get("server_url", DEFAULT_PC_SERVER).rstrip("/")
        target_url = f"{pc_server}{self.path}"
        
        # Read body if any
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        req = urllib.request.Request(target_url, data=body, method=method)
        # Forward headers
        for h in ('Content-Type', 'Range', 'Accept', 'User-Agent'):
            if h in self.headers:
                req.add_header(h, self.headers[h])
                
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                self.send_response(resp.status)
                skip = {'transfer-encoding', 'connection', 'access-control-allow-origin',
                        'access-control-allow-methods', 'access-control-allow-headers',
                        'cache-control', 'server', 'date'}
                for k, v in resp.getheaders():
                    if k.lower() not in skip:
                        self.send_header(k, v)
                self.end_headers()
                shutil.copyfileobj(resp, self.wfile)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(504)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e), "status": "offline"}).encode('utf-8'))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        if os.environ.get("LYNXSHARE_DEBUG") == "1":
            super().log_message(format, *args)


def start_local_server(port):
    server = ThreadingHTTPServer(('127.0.0.1', port), LynxShareHandler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def launch_pywebview(app_url, debug=False):
    try:
        import webview
        print("[LynxShare] Iniciando interfaz nativa con WebKitGTK...")
        webview.create_window(
            title=f"LynxShare {APP_VERSION} - Explorador Multimedia",
            url=app_url,
            width=1320,
            height=860,
            min_size=(850, 600),
            background_color="#090c15",
            text_select=False
        )
        webview.start(gui="gtk", debug=debug)
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

    # 2. Flatpak browsers (popular on Fedora GNOME)
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
    parser.add_argument("--window", action="store_true", help="Abrir en ventana independiente (Brave/Chrome/Edge)")
    parser.add_argument("--brave", action="store_true", help="Abrir directamente en ventana de aplicación Brave")
    parser.add_argument("--gtk", action="store_true", help="Forzar ventana nativa WebKitGTK")
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
    print(f"  Servidor PC Destino: {cfg.get('server_url', DEFAULT_PC_SERVER)}")
    print("==================================================")

    # Standalone browser window requested
    if args.window or args.brave:
        browser_cmd, args_template = find_standalone_browser()
        if browser_cmd:
            proc = launch_app_window(browser_cmd, args_template, app_url)
            if proc:
                try:
                    proc.wait()
                except KeyboardInterrupt:
                    pass
                return

    # 1. Try pywebview (Native GTK WebKit window)
    if not args.browser:
        if launch_pywebview(app_url, debug=bool(args.debug)):
            return

        # 2. Try standalone app window (Chromium / Flatpak / Epiphany)
        browser_cmd, args_template = find_standalone_browser()
        if browser_cmd:
            proc = launch_app_window(browser_cmd, args_template, app_url)
            if proc:
                try:
                    proc.wait()
                except KeyboardInterrupt:
                    pass
                return

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
