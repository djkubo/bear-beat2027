# FTP real con Hetzner Storage Box – qué pasa hoy y cómo arreglarlo

## Tu Storage Box (lo que tienes)

- **Servidor:** `u540473.your-storagebox.de`
- **Usuario principal:** `u540473`
- **Contraseña:** (la que configuraste, ej. Todosmelapelan13)
- **Robot API:** Usuario webservice `#ws+wxFb2r2d`, contraseña la que elegiste en Robot → Settings → Web service and app settings.
- **ID del Storage Box para la API:** suele ser el número del usuario, ej. `540473` (en Robot → Storage Box verás el ID numérico).

Los videos ya están en el servidor (miles de archivos). El listado en la web sale de la tabla `videos` en Supabase; para llenarla desde Hetzner usas `npm run db:sync-videos-ftp` con `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` del usuario principal.

---

## Qué hace la app HOY (y por qué no funciona el FTP)

Hoy, cuando alguien completa una compra:

1. La app **inventa** un usuario y una contraseña:
   - `ftp_username`: `dj_` + primeros 8 caracteres del `user_id` (ej. `dj_a1b2c3d4`)
   - `ftp_password`: una contraseña aleatoria generada en código.
2. Esos valores se guardan en la tabla `purchases` y se muestran en el Dashboard.
3. **No se crea ningún usuario ni subcuenta en Hetzner.** Esos datos no existen en el Storage Box.

Por eso, si tú (o un cliente) usáis en FileZilla ese usuario y contraseña contra `u540473.your-storagebox.de` (o `ftp.bearbeat.mx`), **falla**: Hetzner no conoce ese usuario.

Resumen: la “configuración de server ftp, usuarios, descargas web, zip” que comentas **nunca se implementó contra Hetzner**. Hay credenciales guardadas en la base de datos, pero no usuarios reales en el Storage Box.

---

## Qué hace falta para que sea real

### Opción A – Rápida: una sola cuenta para todos (solo descarga)

- Dar a **todos** los clientes con compra las **mismas** credenciales del Storage Box principal:
  - Host: `u540473.your-storagebox.de`
  - Usuario: `u540473`
  - Contraseña: (la del Storage Box)
- En la app: en lugar de generar `dj_xxx` y una contraseña aleatoria, guardar en `purchases` ese usuario y contraseña (o leerlos de env) y mostrarlos en el Dashboard.
- **Ventaja:** Funciona ya, todos pueden descargar.
- **Desventaja:** Todos comparten la misma contraseña; no hay un usuario por cliente.

### Opción B – Correcta: una subcuenta por compra (solo descarga + admin tú)

Hetzner permite **subcuentas** del Storage Box, con **solo lectura** (descargar, sin subir/borrar). Se gestionan con la **Robot API**:

- **Crear subcuenta:** `POST https://robot-ws.your-server.de/storagebox/{storagebox-id}/subaccount`  
  Parámetros: `username` (ej. `u540473-sub1` o `dj_xxx`), `password`, y opcionalmente `read_only=true`.
- **Cambiar contraseña:** `POST .../subaccount/{sub-account-username}/password`
- **Listar:** `GET .../storagebox/{storagebox-id}/subaccount`
- **Eliminar:** `DELETE .../storagebox/{storagebox-id}/subaccount/{sub-account-username}`

Cada subcuenta tiene su propio dominio, por ejemplo: `u540473-sub1.your-storagebox.de`. El cliente en FileZilla usa ese host, su usuario (ej. `u540473-sub1`) y su contraseña.

Flujo deseado:

1. El cliente paga y completa la compra.
2. El backend (API route) llama a la Robot API y crea una subcuenta **read-only** para ese cliente (usuario único por compra o por usuario).
3. Se guarda en `purchases` el `ftp_username` y `ftp_password` **reales** devueltos/definidos por la API.
4. El Dashboard muestra host correcto (ej. `u540473-sub1.your-storagebox.de`), usuario y contraseña. El cliente usa FileZilla y **sí** puede descargar.

Tú mantienes el usuario principal `u540473` con acceso total (admin); los clientes solo tienen sus subcuentas de solo lectura.

---

## Variables de entorno necesarias (Robot API)

Para que la app pueda crear subcuentas hace falta:

```env
# Robot API (para crear subcuentas FTP en Storage Box)
HETZNER_ROBOT_USER=#ws+wxFb2r2d
HETZNER_ROBOT_PASSWORD=tu_contraseña_del_webservice
HETZNER_STORAGEBOX_ID=540473
# Host base para subcuentas (ej. u540473.your-storagebox.de para listar; subcuentas: u540473-sub1.your-storagebox.de)
HETZNER_STORAGEBOX_HOST=u540473.your-storagebox.de
```

El **Storage Box ID** lo ves en Robot → Storage Box (número del box, no el nombre de usuario).

---

## Sobre “la cuenta que pagué ya debería tener mi usuario ftp”

Sí: la idea es que **cada compra** (o cada usuario con compra) tenga su propio usuario FTP **real** en Hetzner, con permisos solo de descarga. Eso implica:

1. Implementar en el backend la llamada a la Robot API para crear subcuenta al completar la compra.
2. Guardar en `purchases` el usuario y contraseña reales.
3. Mostrar en el Dashboard el **host** correcto de la subcuenta (ej. `u540473-subX.your-storagebox.de`), no un host genérico que no coincida con Hetzner.

Mientras eso no esté implementado, **ninguna** cuenta tiene usuario FTP real creado en el servidor; por eso “nada” de lo que esperabas (usuario, subaccount, permisos solo descarga, admin tú) está funcionando aún.

---

## Mantenimiento Hetzner (aviso que pegaste)

Los avisos de “Phishing emails”, “Routine maintenance”, “High Utilization of Object Storage”, etc. son de la zona de notificaciones de Hetzner. No cambian que:

- El Storage Box sigue siendo `u540473.your-storagebox.de`.
- La Robot API sigue siendo la forma de crear/subcuentas.
- Si hay “Object Storage” con timeouts, puede afectar a listados o descargas muy pesadas; para FTP/Storage Box normal suele seguir funcionando. Si ves problemas, revisa el estado en [Hetzner Status](https://status.hetzner.com/).

---

## Próximo paso recomendado

1. **Corto plazo:** Si quieres que al menos **tú** y los clientes podáis descargar ya, se puede poner la **Opción A** (misma cuenta u540473 para todos) y en el Dashboard usar el host `u540473.your-storagebox.de` y esas credenciales.
2. **Medio plazo:** Implementar la **Opción B** (API route que al completar compra cree subcuenta en Robot, guarde usuario/contraseña en `purchases`, y el Dashboard muestre el host de la subcuenta). Así cada cliente tiene su usuario FTP real, solo descarga, y tú sigues con acceso admin con la cuenta principal.

Si me dices si prefieres primero A o ir directo a B, puedo guiarte paso a paso (qué tocar en el código y en qué orden).
