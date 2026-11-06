# LynxShare para Linux

Cliente de escritorio para streaming multimedia, transferencia local de archivos y sincronización de portapapeles en distribuciones Linux.

Desarrollado en Python con soporte nativo para Wayland y X11, con optimizaciones para equipos portátiles y convertibles (gestos táctiles en pantalla, aceleración por hardware VA-API y bajo impacto en batería).

---

## Funcionalidades

- **Sincronización de Archivos Bidireccional**: Envía y recibe carpetas y archivos pesados desde y hacia dispositivos móviles conectados a la misma red Wi-Fi.
- **Portapapeles Dinámico**: Detección de cambios en el portapapeles del sistema (vía `wl-clipboard` en Wayland o `xclip` en X11) con replicación instantánea hacia clientes móviles.
- **Bandeja del Sistema (Tray Indicator)**: Se ejecuta en segundo plano de forma silenciosa, ofreciendo acceso rápido a descargas recientes y estado del enlace.
- **Integración con Gestores de Archivos**: Notificaciones nativas de escritorio (libnotify) con accesos directos para abrir archivos recibidos en Nautilus, Dolphin o Thunar.

---

## Requisitos

- Python 3.10 o superior
- Soporte de portapapeles: `wl-clipboard` (Wayland) o `xclip` / `xsel` (X11)
- Notificaciones: `libnotify` / `notify-send`

---

## Instalación Rápida

```bash
git clone https://github.com/scarlynx-ai/LynxShare-Linux.git
cd LynxShare-Linux

# Dar permisos de ejecución e instalar en el sistema
chmod +x install.sh
./install.sh
```

El script de instalación crea la entrada de escritorio `.desktop` y configura el demonio para inicio automático opcional.

### Ejecución Directa

```bash
./run.sh
```

---

## Arquitectura del Proyecto

```text
LynxShare-Linux/
├── lynxshare.py          # Punto de entrada de la aplicación y bucle de eventos
├── src/                  # Módulos de red, bandeja del sistema y sockets
├── assets/               # Iconos e interfaces visuales
├── install.sh            # Script de despliegue en Linux (Fedora / Ubuntu / Arch)
└── lynxshare.desktop     # Archivo de integración con el lanzador de aplicaciones
```

---

## Autor

Desarrollado por **Scarlynx**.
