# FTP en Render – mínimo para que funcione

Para que **después de pagar** el usuario tenga **acceso real al servidor de descarga por FTP**, en Render → **Environment** añade **una** de estas dos opciones.

---

## Opción A – Cuenta compartida (más rápido)

Todos los compradores usan la **misma** cuenta FTP (tu Storage Box principal). Basta con 4 variables:

| Variable | Valor | Notas |
|----------|--------|--------|
| `FTP_HOST` | `u540473.your-storagebox.de` | Host de tu Storage Box (cambia 540473 por tu ID) |
| `FTP_USER` | `u540473` | Usuario principal del Storage Box |
| `FTP_PASSWORD` | *(tu contraseña)* | Contraseña del Storage Box |
| `NEXT_PUBLIC_FTP_HOST` | `u540473.your-storagebox.de` | Mismo que FTP_HOST; el dashboard lo muestra al usuario |

Tras el pago, la app guarda estas credenciales en la compra y el usuario las ve en **Dashboard** y en **Complete purchase**. Puede conectar con FileZilla/Air Explorer de inmediato.

---

## Opción B – Subcuenta por compra (Hetzner Robot)

Cada comprador recibe su **propia** subcuenta (solo lectura). Necesitas las 3 variables de la Robot API:

| Variable | Valor |
|----------|--------|
| `HETZNER_ROBOT_USER` | Ej. `#ws+wxFb2r2d` (usuario webservice) |
| `HETZNER_ROBOT_PASSWORD` | Contraseña del webservice |
| `HETZNER_STORAGEBOX_ID` | Ej. `540473` |

Opcional: `NEXT_PUBLIC_FTP_HOST=u540473.your-storagebox.de` para el fallback. Ver `docs/HETZNER_FTP_REAL.md`.

---

## Comprobar

1. Haz un pago de prueba (Stripe o PayPal).
2. En **Dashboard** (o página de complete-purchase) deberías ver Host, Usuario y Contraseña FTP.
3. Conéctate con FileZilla: Host = el que muestra la app, Usuario y Contraseña = los de la app. Debe conectar y listar carpetas.

Si no tienes aún Hetzner Robot, usa **Opción A** (FTP_HOST, FTP_USER, FTP_PASSWORD, NEXT_PUBLIC_FTP_HOST) y el FTP ya funcionará.
