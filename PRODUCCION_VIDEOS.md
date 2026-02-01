# Videos en producción – estructura y variables

## Estructura obligatoria

Los videos deben estar en esta estructura:

```
/Videos Enero 2026/          ← carpeta raíz de videos
  Cumbia/                   ← género (subcarpeta)
    video1.mp4
    video2.mp4
  House/
    video1.mp4
  ...
```

- **Raíz:** carpeta `Videos Enero 2026` (o la que indiques en la variable).
- **Géneros:** cada subcarpeta es un género (Cumbia, House, etc.).
- **Videos:** dentro de cada género, archivos `.mp4`, `.mov`, `.avi`, `.mkv`.

---

## Opción 1: App en tu servidor (carpeta local)

Si la app corre en el mismo servidor donde está la carpeta de videos:

1. Define la ruta absoluta en `.env` o en las variables de entorno del servidor:

   ```env
   VIDEOS_BASE_PATH=/Videos Enero 2026
   ```

   En Windows:

   ```env
   VIDEOS_BASE_PATH=D:\Videos Enero 2026
   ```

2. La app listará las subcarpetas de esa ruta como géneros y los archivos de cada subcarpeta como videos.
3. No hace falta Hetzner para listar/servir videos si usas esta opción.

---

## Opción 2: App en Render (Hetzner)

Si la app está en Render, no hay disco local con esa carpeta. Los videos tienen que estar en **Hetzner Storage Box** con la misma estructura:

1. En Hetzner crea la carpeta `Videos Enero 2026`.
2. Dentro, crea una carpeta por género (Cumbia, House, etc.).
3. Sube los videos dentro de cada carpeta de género.

En Render, en **Environment** del servicio, configura:

- `HETZNER_STORAGEBOX_HOST`, `HETZNER_STORAGEBOX_USER`, `HETZNER_STORAGEBOX_PASSWORD` (acceso WebDAV).
- `HETZNER_VIDEOS_BASE_PATH=Videos Enero 2026` (nombre exacto de la carpeta raíz en Hetzner).
- `NEXT_PUBLIC_APP_URL=https://tu-app.onrender.com` (URL pública de tu app).

Si en Hetzner los géneros están directamente en la raíz (sin carpeta "Videos Enero 2026"), deja `HETZNER_VIDEOS_BASE_PATH` vacío.

---

## Resumen

| Dónde corre la app | Dónde están los videos | Qué configurar |
|--------------------|------------------------|----------------|
| Tu servidor        | Carpeta local en el servidor | `VIDEOS_BASE_PATH=/Videos Enero 2026` (ruta absoluta) |
| Render             | Hetzner Storage Box   | `HETZNER_*` y `HETZNER_VIDEOS_BASE_PATH=Videos Enero 2026` |

La web mostrará los géneros (subcarpetas) y los videos de cada género. Thumbnails, demos y descargas usan la misma estructura.
