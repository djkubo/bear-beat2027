# Pruebas de Stripe y PayPal en sandbox

Este documento explica cómo hacer pruebas de pago con **Stripe** y **PayPal** en modo sandbox/test sin cobrar dinero real.

---

## Resumen

| Proveedor | Modo pruebas | Cómo activarlo |
|-----------|--------------|----------------|
| **Stripe** | Claves que empiezan por `pk_test_` y `sk_test_` | Usar claves de test del [Dashboard Stripe](https://dashboard.stripe.com/test/apikeys) |
| **PayPal** | Sandbox | `PAYPAL_USE_SANDBOX=true` y credenciales de app **Sandbox** en [developer.paypal.com](https://developer.paypal.com) |

En la página de checkout, si está activo el modo pruebas, se muestra un banner amarillo: **"Modo pruebas: Stripe (test) · PayPal (sandbox) — No se cobra dinero real"**.

---

## 1. Stripe (tarjeta, OXXO, SPEI)

### Activar modo test

- En `.env.local` (y en Render si quieres probar en producción con test):
  - `NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...`
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (crear un endpoint de webhook en modo **Test** en el Dashboard)

Con claves `pk_test_` / `sk_test_`, Stripe ya opera en modo test; no hace falta ninguna variable extra.

### Tarjetas de prueba (Stripe)

En [Stripe – Tarjetas de prueba](https://docs.stripe.com/testing#cards):

- **Pago correcto:** `4242 4242 4242 4242`
- **Rechazada:** `4000 0000 0000 0002`
- **Requiere autenticación (3D Secure):** `4000 0025 0000 3155`
- Fecha de caducidad: cualquier fecha futura (ej. 12/34)
- CVC: cualquier 3 dígitos (ej. 123)
- Código postal: cualquiera (ej. 12345)

### OXXO / SPEI (Stripe Checkout)

Si usas el flujo de redirección a Stripe Checkout para OXXO/SPEI, en modo test Stripe genera referencias/CLABE de prueba; no se realizan cobros reales.

---

## 2. PayPal (sandbox)

### Activar sandbox

1. **Crear app Sandbox en PayPal**
   - Entra en [developer.paypal.com](https://developer.paypal.com) → **Apps & Credentials**.
   - En **Sandbox** (no Live), crea una app o usa la predeterminada.
   - Copia **Client ID** y **Secret**.

2. **Variables de entorno**
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID=<Client ID de la app Sandbox>`
   - `PAYPAL_CLIENT_SECRET=<Secret de la app Sandbox>`
   - `PAYPAL_USE_SANDBOX=true`  
     Para que el front muestre el banner y el backend use la API de sandbox, en el cliente también puedes poner:  
     `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=true`

En producción (por ejemplo Render) puedes dejar `PAYPAL_USE_SANDBOX=true` y las credenciales de sandbox para seguir haciendo pruebas sin cobros reales.

### Cuentas de prueba PayPal Sandbox

En [developer.paypal.com](https://developer.paypal.com) → **Sandbox** → **Accounts** hay cuentas de prueba (comprador y negocio). Puedes iniciar sesión en el flujo de PayPal con el correo/contraseña de una cuenta **Personal** (comprador) para simular el pago; no se mueve dinero real.

---

## 3. Checklist rápido

- [ ] Stripe: `NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...` y `STRIPE_SECRET_KEY=sk_test_...`
- [ ] PayPal: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` y `PAYPAL_USE_SANDBOX=true` (credenciales de app Sandbox)
- [ ] (Opcional) `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=true` para mostrar el indicador de PayPal sandbox en el checkout
- [ ] En checkout ves el banner **"Modo pruebas"** cuando corresponde
- [ ] Probar tarjeta con `4242 4242 4242 4242` y flujo completo hasta `/complete-purchase`
- [ ] Probar PayPal con una cuenta Sandbox y flujo hasta activación de compra

Cuando quieras cobros reales: cambia Stripe a claves `pk_live_` / `sk_live_`, PayPal a app **Live** y quita o pon `PAYPAL_USE_SANDBOX=false` según corresponda.
