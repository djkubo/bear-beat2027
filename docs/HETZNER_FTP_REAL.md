# FTP real con Hetzner Storage Box

## Tu Storage Box (lo que tienes)

- **Servidor:** `u540473.your-storagebox.de`
- **Usuario principal:** `u540473`
- **Contraseña:** (la que configuraste)
- **Robot API:** Usuario webservice `#ws+wxFb2r2d`, contraseña la que elegiste en Robot → Settings → Web service and app settings.
- **ID del Storage Box para la API:** número del box, ej. `540473` (Robot → Storage Box).

Los videos ya están en el servidor. El listado en la web sale de la tabla `videos` en Supabase; para llenarla desde Hetzner usas `npm run db:sync-videos-ftp` con `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` del usuario principal.

---

## Qué hace la app HOY (implementado)

**La Opción B (subcuenta por compra) está implementada.**

1. **Al completar compra** (`/complete-purchase`): el front llama a `POST /api/complete-purchase/activate` con `sessionId`, `userId`, `email`, `name`, `phone`. El backend verifica el pago en Stripe; si están configurados `HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD` y `HETZNER_STORAGEBOX_ID`, llama a la Robot API y crea una **subcuenta real** en el Storage Box (solo lectura). El username se genera como `u{storageboxId}-sub{N}` (ej. `u540473-sub1`). Si la Robot API falla, se guardan credenciales generadas (`dj_xxx`) como fallback. Se guarda en `purchases` el `ftp_username` y `ftp_password` reales.

2. **Dashboard** (`/dashboard`): muestra credenciales FTP reales de la compra; el host es `{ftp_username}.your-storagebox.de` cuando el username contiene `-sub`, si no usa `NEXT_PUBLIC_FTP_HOST`.

3. **Código:** `src/lib/hetzner-robot.ts` (createStorageBoxSubaccount, isHetznerFtpConfigured), `src/app/api/complete-purchase/activate/route.ts`, `src/app/complete-purchase/page.tsx`.

**Para que funcione en producción:** en Render (o .env.local) configura `HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD` y `HETZNER_STORAGEBOX_ID`. Opcional: `NEXT_PUBLIC_FTP_HOST=u540473.your-storagebox.de` para el fallback.

---

## Opciones de referencia

### Opción A – Rápida: una sola cuenta para todos (solo descarga)

- Dar a **todos** los clientes con compra las **mismas** credenciales del Storage Box principal (Host: `u540473.your-storagebox.de`, Usuario: `u540473`, Contraseña).
- **Ventaja:** Funciona ya. **Desventaja:** Todos comparten la misma contraseña.

### Opción B – Correcta (ya implementada): una subcuenta por compra

Hetzner permite subcuentas del Storage Box, solo lectura. Se gestionan con la **Robot API** (uso directo, sin SDK):

- **Doc oficial:** https://robot.hetzner.com/doc/webservice/en.html#storage-box
- **Listar subcuentas:** `GET https://robot-ws.your-server.de/storagebox/{storagebox-id}/subaccount`
- **Crear subcuenta:** `POST https://robot-ws.your-server.de/storagebox/{storagebox-id}/subaccount` con `username`, `password`, `read_only=true`.
- Cada subcuenta tiene su propio host: `u540473-sub1.your-storagebox.de`.

La app ya llama a esta API directamente desde `src/lib/hetzner-robot.ts` al completar la compra (ver sección "Qué hace la app HOY" arriba).

---

## Variables de entorno (Robot API)

```env
HETZNER_ROBOT_USER=#ws+wxFb2r2d
HETZNER_ROBOT_PASSWORD=tu_contraseña_del_webservice
HETZNER_STORAGEBOX_ID=540473
NEXT_PUBLIC_FTP_HOST=u540473.your-storagebox.de
```

El Storage Box ID lo ves en Robot → Storage Box (número del box).

---

## API Robot (uso directo)

La app **no usa SDK de terceros**: llama a la API REST de Hetzner directamente desde `src/lib/hetzner-robot.ts` con `fetch`, usando:

- **Base URL:** `https://robot-ws.your-server.de`
- **Autenticación:** HTTP Basic Auth con `HETZNER_ROBOT_USER` y `HETZNER_ROBOT_PASSWORD`
- **Endpoints usados:** `GET /storagebox/{id}/subaccount` (listar), `POST /storagebox/{id}/subaccount` (crear)

Documentación oficial: [robot.hetzner.com/doc/webservice](https://robot.hetzner.com/doc/webservice/en.html#storage-box).

---

## Mantenimiento Hetzner

Los avisos de Phishing, mantenimiento, Object Storage, etc. son de la zona de notificaciones de Hetzner. El Storage Box y la Robot API siguen siendo la forma de crear subcuentas. Si hay problemas, revisa [Hetzner Status](https://status.hetzner.com/).
