# Checklist: Listo para producción

Revisión de documentación y estado del proyecto para llevar Bear Beat a producción.

---

## Contenido: solo desde el servidor (Hetzner)

- **Lista de videos, portadas, metadatos, descargas, ZIP y demos** salen **solo de Hetzner Storage Box** (WebDAV).
- No hay disco local: si Hetzner no está configurado (HETZNER_STORAGEBOX_HOST, USER, PASSWORD), las APIs devuelven 503.
- Lo que subes por **FTP** a Hetzner es lo mismo que se ve y se descarga por la **web** (misma Storage Box vía WebDAV).

### FTP (clientes con compra)

- Los clientes descargan por FTP con las credenciales del dashboard (FileZilla, etc.) desde la misma Storage Box.

### Web (lista + descarga + ZIP)

- `/api/videos`, `/api/thumbnail`, `/api/download`, `/api/download-zip`, `/api/demo` leen **todo** desde Hetzner WebDAV.
- Para portadas y metadatos automáticos (duración, resolución) el servidor donde corre Next.js debe tener **ffmpeg/ffprobe** (ver **DESPLIEGUE_SERVIDOR.md**).

---

## Dónde desplegar la web

**Ver guía completa:** [DESPLIEGUE_SERVIDOR.md](./DESPLIEGUE_SERVIDOR.md)

- **Recomendado:** **Hetzner VPS** (Node + ffmpeg) para que todo jale (thumbnails, metadatos, descargas, ZIP).
- **Alternativas:** Railway/Render con Docker + ffmpeg, o Vercel (sin ffmpeg: tendrás que subir .jpg y .json a Hetzner para portadas y metadatos).

---

## Cómo ver la página

- **Desarrollo:** `npm run dev` → http://localhost:3000 (necesitas Hetzner en `.env.local` para ver videos).
- **Producción:** Desplegar en un servidor con las variables de entorno de producción (ver abajo).

---

## Checklist de producción

### Variables de entorno (servidor)

| Variable | Uso |
|----------|-----|
| `HETZNER_STORAGEBOX_HOST` | Host del Storage Box (ej. u540473.your-storagebox.de) |
| `HETZNER_STORAGEBOX_USER` | Usuario WebDAV |
| `HETZNER_STORAGEBOX_PASSWORD` | Contraseña WebDAV |
| `NEXT_PUBLIC_APP_URL` | URL pública (ej. https://bearbeat.mx) |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Auth y BD |
| `NEXT_PUBLIC_PAYPAL_*` / `PAYPAL_CLIENT_SECRET` | PayPal (producción) |
| `HETZNER_STORAGEBOX_ID`, `HETZNER_ROBOT_*` | Solo si usas creación automática de FTP por API Robot |

### Base de datos (Supabase)

- [ ] Schema de producción (packs, purchases, users, ftp_pool, etc.).
- [ ] RLS y políticas probadas.
- [ ] Confirmación de email configurada si la quieres.

### Pagos

- [ ] PayPal: credenciales live y URLs de return/cancel con dominio real.

### Dominio y hosting

- [ ] Dominio apuntando al servidor donde corre Next.js.
- [ ] HTTPS (Let’s Encrypt o el que ofrezca el host).
- [ ] Variables de entorno de producción configuradas en el host.

### Contenido

- [ ] Videos (y opcionalmente .jpg y .mp4.json) subidos a Hetzner (por FTP o WebDAV).
- [ ] Sin Hetzner configurado la web no mostrará videos ni descargas (503).

### Seguridad

- [ ] `.env` y secretos nunca en Git.
- [ ] Claves solo en variables de entorno del servidor.

---

## Resumen rápido

| Pregunta | Respuesta |
|----------|-----------|
| ¿De dónde sale el contenido en la web? | **Solo de Hetzner Storage Box** (WebDAV). |
| ¿Hay disco local para videos? | **No.** Todo desde el servidor (Hetzner). |
| ¿Dónde desplegar para que jale bien? | **Hetzner VPS** (con ffmpeg) o Railway/Render con Docker. Ver DESPLIEGUE_SERVIDOR.md. |
| ¿“Descargar todo (ZIP)” funciona? | **Sí**, desde Hetzner. |
| ¿Listo para producción? | Sí, cuando tengas Hetzner + Supabase + PayPal en prod y el sitio desplegado en un servidor con las variables configuradas. |
