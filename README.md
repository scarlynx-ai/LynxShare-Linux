# LynxShare para Linux (Fedora Edition) 🚀

> **Cliente de escritorio para streaming multimedia, gestión de archivos y portapapeles compartido en red local.**
> Optimizado especialmente para la laptop **Lenovo Yoga 7 2-in-1 14ILL10 (Intel Core Ultra 7 258V Lunar Lake)** con **Fedora Linux**, aceleración por hardware Intel Arc 140V (VA-API), soporte nativo Wayland y gestos táctiles.

---

## 💻 Características Especiales para Lenovo Yoga 7 2-in-1

- **Modo Tablet y Pantalla Táctil 2-in-1**:
  - Elementos de interfaz táctil amplios (touch targets de 48px+).
  - Gestos táctiles en reproductor de video:
    - Deslizar verticalmente a la **izquierda**: ajusta el brillo de la pantalla.
    - Deslizar verticalmente a la **derecha**: ajusta el volumen.
    - Doble toque en el tercio **izquierdo**: retrocede 10 segundos con animación visual.
    - Doble toque en el tercio **derecho**: adelanta 10 segundos con animación visual.
    - Toque simple: muestra/oculta la barra de controles con auto-ocultamiento a los 3.5 segundos.
- **Reproductor de Video Inmersivo (FIT vs INMERSIVO)**:
  - Botón selector de proporción de aspecto:
    - **FIT (Ajustado)**: respeta la resolución original del video con bandas negras centradas.
    - **INMERSIVO (Llenar pantalla)**: aprovecha el panel 16:10 / 16:9 de la Yoga 7 llenando la pantalla sin bordes negros.
  - Streaming fluido mediante peticiones HTTP Range (`/api/stream`) con aceleración por hardware de video (Intel Lunar Lake Arc GPU).
  - Selector de velocidad (0.75x, 1.0x, 1.25x, 1.5x, 2.0x).
  - Modo Picture-in-Picture (PiP) y Pantalla Completa nativa.
- **Visor de Fotos Tipo Galería**:
  - Zoom con rueda o gesto táctil de pellizco.
  - Navegación táctil con deslizamiento entre fotos.
  - Botón de descarga directa en calidad original.
- **Reproductor Flotante de Música**:
  - Barra inferior con control de reproducción, avance/retroceso rápido y volumen sin interrumpir la navegación por carpetas.
- **Gestión Completa de Archivos**:
  - Descarga individual o de carpetas completas en archivo ZIP comprimido.
  - Subida de archivos mediante botón o arrastrando y soltando (**Drag & Drop**) directamente sobre la ventana.
  - Crear nuevas carpetas, renombrar y eliminar archivos con diálogo de seguridad.
  - Barra de búsqueda en tiempo real y chips de categorías: *Videos*, *Música*, *Fotos*, *Documentos*, *Comprimidos* y *APKs*.
- **Portapapeles & Notas Compartidas**:
  - Sincronización bidireccional inmediata de texto y enlaces entre la laptop con Fedora y la PC con Windows.
  - Copiado automático al portapapeles del sistema Linux en un clic.
- **Transmisión a Smart TV (Cast)**:
  - Envía la película o pista musical directamente a la Smart TV de la sala o dormitorio a través del servidor PC.

---

## ⚡ Instalación en Fedora Linux

### Opción 1: Instalación Rápida con 1 Solo Comando en Terminal

Abre tu terminal en Fedora y ejecuta:

```bash
curl -fsSL https://apkserver.vercel.app/install-fedora.sh | bash
```

¡Listo! El instalador descargará la aplicación, creará el acceso directo en el menú de aplicaciones de GNOME/KDE (`LynxShare`), instalará el icono en alta resolución y habilitará el comando `lynxshare` en tu terminal.

---

### Opción 2: Descarga Manual del Paquete `.tar.gz`

1. Descarga el paquete desde el catálogo de [https://apkserver.vercel.app](https://apkserver.vercel.app) (`lynxshare-fedora-x86_64.tar.gz`).
2. Extrae el archivo en tu carpeta de Descargas o donde prefieras:
   ```bash
   tar -xvf lynxshare-fedora-x86_64.tar.gz
   cd lynxshare-fedora-x86_64
   ```
3. Ejecuta el instalador:
   - Para tu usuario actual (recomendado):
     ```bash
     ./install.sh
     ```
   - O a nivel del sistema (para todos los usuarios):
     ```bash
     sudo ./install.sh
     ```

---

### Opción 3: Modo Portable (Sin Instalar)

Si prefieres ejecutarlo directamente sin instalar nada:
```bash
./run.sh
```

---

## ⌨️ Atajos de Teclado en Reproductor de Video

| Tecla | Acción |
| :--- | :--- |
| `Espacio` o `K` | Reproducir / Pausar |
| `Flecha Derecha` | Avanzar 10 segundos |
| `Flecha Izquierda` | Retroceder 10 segundos |
| `F` | Alternar Pantalla Completa |
| `M` | Silenciar / Activar Sonido |
| `Escape` | Cerrar el reproductor / Salir de pantalla completa |

---

## 🛠️ Requisitos del Sistema

- **Distribución:** Fedora 40 / 41 / 42 o compatible (RHEL, AlmaLinux, Rocky).
- **Python:** Python 3.10 o superior (incluido por defecto en Fedora).
- **Aceleración por Hardware (Recomendado para Intel Arc Lunar Lake):**
  ```bash
  sudo dnf install -y intel-media-driver libva-utils
  ```
- **Conectividad:** Estar conectado a la misma red Wi-Fi o red local donde corre el servidor PC (`http://192.168.31.219:8090`).

---

## 🗑️ Desinstalación

Para desinstalar LynxShare en cualquier momento:
```bash
~/.local/share/lynxshare/uninstall.sh
```
O si lo instalaste con `sudo`:
```bash
sudo /opt/lynxshare/uninstall.sh
```

---

Desarrollado con ❤️ por **Scarlynx Dev**.
