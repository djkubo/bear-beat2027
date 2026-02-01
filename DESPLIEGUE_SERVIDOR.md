# Dónde desplegar Bear Beat para que jale bien

Todo el contenido (videos, portadas, descargas, ZIP, demos) sale **solo del servidor Hetzner Storage Box** (WebDAV). No hay disco local: la web **requiere** Hetzner configurado.

Para que la web funcione al 100% necesitas:

1. **Hetzner Storage Box** con los videos subidos (ya lo tienes).
2. **Un servidor** donde corra Next.js con **ffmpeg/ffprobe** (para generar portadas y metadatos la primera vez).
3. **Variables de entorno** en ese servidor (Hetzner, Supabase, PayPal, etc.).

---

## Opciones de servidor (recomendadas)

### 1. **Hetzner VPS** (recomendado)

- **Por qué:** Misma red que tu Storage Box, baja latencia, barato, control total.
- **Qué necesitas:** Un VPS (ej. CX22 o CPX11, ~4–6 €/mes).
- **Pasos:**
  1. Crear VPS en [Hetzner Cloud](https://www.hetzner.com/cloud).
  2. Instalar Node.js 20+, ffmpeg y nginx (o Caddy).
  3. Clonar el repo, `npm install --legacy-peer-deps`, `npm run build`, `npm start` (o usar PM2).
  4. Configurar variables de entorno (HETZNER_STORAGEBOX_*, Supabase, PayPal, NEXT_PUBLIC_APP_URL con tu dominio).
  5. Poner nginx como reverse proxy con SSL (Let’s Encrypt).
- **ffmpeg:** `apt install ffmpeg` (o equivalente). Así se generan thumbnails y metadatos desde los videos en Hetzner.

### 2. **Railway** o **Render**

- **Por qué:** Despliegue fácil desde Git, no gestionas el SO.
- **Limitación:** En el plan gratuito/básico el disco es efímero: la caché de thumbnails y metadata se pierde al reiniciar. No importa: se vuelve a generar desde Hetzner.
- **ffmpeg:** En Railway/Render suele no estar por defecto. Opciones:
  - Usar un **Dockerfile** que instale ffmpeg en la imagen.
  - O desplegar sin ffmpeg: las portadas serán el favicon/placeholder y no tendrás duración/resolución hasta que subas `.jpg` y `.mp4.json` a Hetzner.

Ejemplo de **Dockerfile** (para Railway/Render con ffmpeg):

```dockerfile
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. **Vercel**

- **Por qué:** Muy cómodo para Next.js.
- **Limitaciones:**
  - **Sin ffmpeg** en el runtime por defecto. No podrás generar thumbnails ni metadatos desde el video; tendrás que subir `.jpg` y `.mp4.json` a Hetzner.
  - Funciones serverless con timeout (10–60 s según plan). Descargas/ZIP de archivos grandes pueden dar problemas si el timeout es corto.
- Si solo usas Hetzner para listar y descargar (sin generar portadas en el servidor), Vercel puede servir. Para thumbnails/metadatos automáticos, mejor VPS o Railway/Render con Docker.

---

## Resumen: qué servidor elegir

| Objetivo | Opción |
|----------|--------|
| Todo funcionando (portadas + metadatos automáticos + descargas + ZIP) | **Hetzner VPS** con Node + ffmpeg |
| Desplegar rápido y aceptar placeholder en portadas / sin metadatos automáticos | **Vercel** (subes .jpg y .json a Hetzner a mano) |
| Desplegar fácil pero con ffmpeg (thumbnails/metadatos) | **Railway** o **Render** con Dockerfile que instale ffmpeg |

---

## Variables de entorno en el servidor

En el servidor (VPS, Railway, Render o Vercel) configura al menos:

- `HETZNER_STORAGEBOX_HOST` (ej. `u540473.your-storagebox.de`)
- `HETZNER_STORAGEBOX_USER`
- `HETZNER_STORAGEBOX_PASSWORD`
- `NEXT_PUBLIC_APP_URL` = `https://tudominio.com`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- PayPal: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- Si usas FTP automático por API Robot: `HETZNER_STORAGEBOX_ID`, `HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD`

Sin Hetzner (host + user + password) la web devolverá 503 en videos, thumbnail, download, download-zip y demo: **todo está pensado para correr desde el servidor (Hetzner), no en local.**

---

## Escalar descargas (Bunny CDN, opcional)

Para **muchas descargas simultáneas** (ej. 300+) sin chocar con el límite de 10 conexiones del Storage Box, configura **Bunny CDN**:

- **Descarga de un archivo:** Si están definidos `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY` y `BUNNY_STORAGE_ZONE`, `/api/download` redirige a una URL firmada de Bunny; el usuario descarga directo del CDN.
- **ZIP:** Si están definidos `BUNNY_STORAGE_ZONE` y `BUNNY_STORAGE_PASSWORD`, el ZIP se construye leyendo desde Bunny Storage en lugar de Hetzner.

Debes tener el **mismo contenido** (misma estructura de carpetas) en Bunny que en Hetzner. Ver **CAPACIDAD_Y_ESCALADO.md** para sincronización y variables.
