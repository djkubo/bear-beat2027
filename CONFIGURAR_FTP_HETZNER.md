# Configuración FTP con Hetzner Storage Box

Tu Storage Box: **u540473.your-storagebox.de**

## Documentación Hetzner

- [Resumen Storage Box](https://docs.hetzner.com/storage/storage-box/general/)
- [Acceso FTP/FTPS](https://docs.hetzner.com/storage/storage-box/access/access-ftp-ftps/)
- [Acceso SFTP](https://docs.hetzner.com/storage/storage-box/access/access-sftp-scp/)
- [Resumen de puertos y protocolos](https://docs.hetzner.com/storage/storage-box/access/access-overview/)

## Puertos y protocolos

| Protocolo | Puerto | Uso |
|-----------|--------|-----|
| FTP      | 21 | Sin cifrado (no recomendado) |
| **FTPS** | 21 | FTP + TLS (recomendado en FileZilla) |
| **SFTP** | 22 | SSH File Transfer (recomendado) |

- **Cuenta principal:** `u540473.your-storagebox.de` — usuario `u540473`, contraseña la que configuraste en Hetzner Console.
- **Subcuentas:** hasta 100; formato `u540473-sub1.your-storagebox.de`, usuario `u540473-sub1`. Cada una ve solo su carpeta. Se pueden crear por **Robot API** (automático) o en Hetzner Console (manual).

## Qué configuraste en el proyecto

1. **Variables en `.env.local`** (servidor):
   - `HETZNER_STORAGEBOX_HOST=u540473.your-storagebox.de`
   - `HETZNER_STORAGEBOX_USER=u540473`
   - `HETZNER_STORAGEBOX_PASSWORD=` ← **Pon aquí la contraseña del Storage Box** (Hetzner Console).
   - `HETZNER_STORAGEBOX_PORT=21` (FTP/FTPS) o `22` (SFTP).
   - `HETZNER_STORAGEBOX_USE_FTPS=true` para recomendar FTPS en el dashboard.

2. **API** `GET /api/ftp-credentials`: devuelve host, puerto, usuario y contraseña solo si el usuario está logueado y tiene al menos una compra. La contraseña no se expone en el cliente hasta que se llama a esta API.

3. **Dashboard** (`/dashboard` → pestaña “Descarga FTP”): obtiene las credenciales desde la API y muestra servidor, puerto, usuario y contraseña para usar en FileZilla/Air Explorer.

## Qué debes hacer tú

1. En **Hetzner Console** → tu Storage Box → revisa que esté activado el acceso por **FTP** (y/o FTPS/SFTP si quieres).
2. Copia la **contraseña** del usuario `u540473` (o la que uses) y pégalas en `.env.local` en `HETZNER_STORAGEBOX_PASSWORD`.
3. Sube el contenido del pack a la Storage Box (por FTP/SFTP o desde otro servidor). La ruta que vea el usuario será la raíz de ese usuario (cuenta principal ve todo; subcuentas solo su carpeta).
4. Reinicia el servidor Next.js para que cargue las nuevas variables.

## FileZilla

- **Servidor:** `u540473.your-storagebox.de`
- **Usuario:** `u540473`
- **Contraseña:** la de Hetzner (o la que muestre el dashboard).
- **Puerto:** 21 (FTP/FTPS) o 22 (SFTP).
- Usar **FTPS (FTP sobre TLS)** o **SFTP** para conexión cifrada.

## ¿Lo que subo por FTP se ve en la web?

**FTP:** Lo que subes a Hetzner lo descargan los clientes **por FTP** (FileZilla, etc.) con las credenciales del dashboard. ✅

**Web:** La lista y la descarga por navegador salen de la carpeta **`VIDEOS_PATH`** en el **servidor** donde corre Next.js (no de Hetzner). Para que sea el mismo contenido:

- **Opción recomendada:** En el servidor de producción, sincronizar Hetzner → carpeta local con **rclone** (SFTP) y definir `VIDEOS_PATH` como esa carpeta. Así lo que subes por FTP a Hetzner se refleja en la web.
- Ver **LISTO_PARA_PRODUCCION.md** para el checklist completo y detalles.

## Quién puede hacer qué

- **Tú (admin):** Subes y borras contenido con la **cuenta principal** `u540473` en FileZilla. Esa cuenta **no** la pongas en la app para clientes.
- **Clientes (quienes pagan):** Solo **descargar**. No pueden subir, borrar ni modificar nada.

Para que sea así, en la app (variables de entorno) debes usar una **subcuenta de solo lectura**:

1. En Hetzner Console → tu Storage Box → **Sub-accounts** → **Add sub-account**.
2. Crea una subcuenta solo para descargas, por ejemplo: `u540473-download`.
3. Asígnale una contraseña y **marca la opción de solo lectura** (read-only) para esa subcuenta.
4. En `.env` del servidor pon **esa** subcuenta:
   - `HETZNER_STORAGEBOX_HOST=u540473-download.your-storagebox.de`
   - `HETZNER_STORAGEBOX_USER=u540473-download`
   - `HETZNER_STORAGEBOX_PASSWORD=contraseña_de_esa_subcuenta`

Así, en el dashboard los clientes solo ven credenciales de la subcuenta **read-only**: pueden descargar todo, pero no subir ni borrar. Tú sigues usando la cuenta principal `u540473` en FileZilla para subir y borrar.

## Un FTP por cliente (implementado)

Cada cliente de pago tiene **su propia cuenta FTP**. Hay dos modos:

### Opción A: Creación automática (recomendado)

Cuando un cliente paga, la app **crea una subcuenta nueva** en Hetzner por API (Robot Webservice) y se la asigna. No tienes que crear nada a mano.

1. En **Hetzner Robot** → Settings → **Web service and app settings** crea un usuario para la API (usuario + contraseña).
2. Obtén el **ID numérico** de tu Storage Box (en Robot, lista de Storage Boxes; si tu usuario es `u540473`, el ID suele ser `540473`).
3. En `.env.local` añade:
   - `HETZNER_STORAGEBOX_ID=540473`
   - `HETZNER_ROBOT_USER=tu_usuario_robot`
   - `HETZNER_ROBOT_PASSWORD=tu_contraseña_robot`
4. Al completar una compra (Stripe o PayPal), la app llama a la API de Hetzner, crea una subcuenta read-only y guarda usuario/contraseña en la compra. El cliente ve sus credenciales en el dashboard.

Documentación Robot: https://robot.hetzner.com/doc/webservice/en.html (Storage Box → POST /storagebox/{id}/subaccount).

### Opción B: Pool manual

Si no configuras la API Robot, la app usa un **pool** de subcuentas que tú creas y añades en **Admin** → **FTP Pool**.

1. En **Hetzner Console** creas subcuentas read-only (ej. `u540473-sub1`, `u540473-sub2`, …).
2. En la app: **Admin** → **FTP Pool** (`/admin/ftp-pool`). Añades cada subcuenta (usuario + contraseña) al pool.
3. Al completar una compra, se asigna una cuenta libre del pool a esa compra.
4. Necesitas la tabla `ftp_pool` en Supabase (script en `supabase/ftp_pool.sql`) y tener siempre varias cuentas libres.

En ambos casos, `/api/ftp-credentials` devuelve las credenciales de la compra del usuario (su cuenta FTP).
