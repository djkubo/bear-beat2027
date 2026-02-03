# PayPal en producción – Bear Beat 2027

Checklist para pasar de **Sandbox** a **Live** y aceptar pagos reales con PayPal.

---

## Qué necesitas (resumen)

| Variable | Sandbox (pruebas) | Producción (Live) |
|----------|-------------------|-------------------|
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client ID de app **Sandbox** | Client ID de app **Live** |
| `PAYPAL_CLIENT_SECRET` | Secret de app **Sandbox** | Secret de app **Live** |
| `PAYPAL_USE_SANDBOX` | `true` | `false` |
| `NEXT_PUBLIC_PAYPAL_USE_SANDBOX` | `true` (muestra banner) | `false` |

PayPal **no usa webhook** en este proyecto: el flujo es crear orden → usuario paga en PayPal → redirect a `/complete-purchase` → la app captura el pago con la API. Solo hace falta cambiar a credenciales Live y desactivar sandbox.

---

## Paso 1: App Live en PayPal

1. Entra en [developer.paypal.com](https://developer.paypal.com) e inicia sesión.
2. Arriba cambia de **Sandbox** a **Live** (o en **Apps & Credentials** asegúrate de estar en la pestaña **Live**).
3. En **Apps & Credentials** → **Live**:
   - Si ya tienes una app Live (ej. “Bear Beat”), úsala.
   - Si no, **Create App**: nombre ej. “Bear Beat Live”, tipo **Merchant** (o el que aplique).
4. En la app Live copia:
   - **Client ID** → será `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - **Secret** (Show → copiar) → será `PAYPAL_CLIENT_SECRET`

---

## Paso 2: Variables en tu entorno

En **`.env.local`** (y luego en Render) pon o actualiza:

```env
# PayPal – Producción (Live)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<Client ID de la app Live>
PAYPAL_CLIENT_SECRET=<Secret de la app Live>
PAYPAL_USE_SANDBOX=false
NEXT_PUBLIC_PAYPAL_USE_SANDBOX=false
```

- Con `PAYPAL_USE_SANDBOX=false` el backend usa `https://api-m.paypal.com` (cobros reales).
- Con `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=false` el checkout no muestra el banner “Modo pruebas” de PayPal.

---

## Paso 3: Subir a Render

1. Guarda los cambios en `.env.local`.
2. Ejecuta:
   ```bash
   npm run deploy:env
   ```
   Así se suben las variables de PayPal (y el resto) al Environment de Render y se dispara un deploy.

O bien en **Render Dashboard** → servicio bear-beat2027 → **Environment**: añade/edita las 4 variables anteriores.

---

## Paso 4: Comprobar

1. Abre **https://bear-beat2027.onrender.com/checkout**.
2. Elige **PayPal** como método de pago.
3. Deberías ir a **paypal.com** (no sandbox.paypal.com) y, al pagar, volver a `/complete-purchase` para completar datos y activar el acceso.
4. No debe aparecer el banner “Modo pruebas: PayPal (sandbox)” cuando `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=false`.

---

## Resumen

| Paso | Acción |
|------|--------|
| 1 | En developer.paypal.com → **Live** → crear/usar app → copiar **Client ID** y **Secret**. |
| 2 | En `.env.local`: poner esas credenciales y `PAYPAL_USE_SANDBOX=false`, `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=false`. |
| 3 | `npm run deploy:env` (o añadir las 4 variables en Render a mano). |
| 4 | Probar un pago con PayPal en producción. |

Ver también: [PRUEBAS_STRIPE_Y_PAYPAL_SANDBOX.md](./PRUEBAS_STRIPE_Y_PAYPAL_SANDBOX.md) para Sandbox.
