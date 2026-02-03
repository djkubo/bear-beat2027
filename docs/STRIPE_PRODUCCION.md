# Stripe en producción – Bear Beat 2027

Checklist para pasar de **modo Test** a **modo Live** y cobrar pagos reales.

---

## Qué necesitas (resumen)

| Qué | Dónde obtenerlo |
|-----|------------------|
| **Clave pública Live** | Stripe Dashboard → [API Keys](https://dashboard.stripe.com/apikeys) (cambia a **Live**) → Public key `pk_live_...` |
| **Clave secreta Live** | Mismo sitio → Secret key `sk_live_...` (revelar y copiar) |
| **Secreto del webhook Live** | Stripe Dashboard → [Webhooks](https://dashboard.stripe.com/webhooks) (modo **Live**) → Crear endpoint → Signing secret `whsec_...` |

---

## Paso 1: Activar modo Live en Stripe

1. Entra a [dashboard.stripe.com](https://dashboard.stripe.com).
2. Arriba a la derecha cambia de **Test** a **Live** (interruptor).
3. Si te pide activar la cuenta (identidad, banco, etc.), completa el proceso. Sin cuenta Live activa no puedes cobrar de verdad.

---

## Paso 2: Copiar claves Live

1. [Developers → API Keys](https://dashboard.stripe.com/apikeys) (en modo **Live**).
2. **Publishable key:** copia `pk_live_...` → será `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`.
3. **Secret key:** clic en "Reveal" y copia `sk_live_...` → será `STRIPE_SECRET_KEY`.

---

## Paso 3: Crear webhook en modo Live

1. [Developers → Webhooks](https://dashboard.stripe.com/webhooks) (en modo **Live**).
2. **Add endpoint**.
3. **Endpoint URL:**  
   `https://bear-beat2027.onrender.com/api/webhooks/stripe`  
   (o tu dominio si ya usas uno, ej. `https://bearbeat.mx/api/webhooks/stripe`).
4. **Events to send:** añade al menos:
   - `checkout.session.completed` (Checkout, OXXO, SPEI)
   - `payment_intent.succeeded` (tarjeta / Payment Element)
5. Guarda. En la página del endpoint, en **Signing secret** clic en "Reveal" y copia `whsec_...` → será `STRIPE_WEBHOOK_SECRET`.

---

## Paso 4: Poner las variables en producción

### Opción A – Con script (recomendado)

1. En tu **`.env.local`** (solo en tu máquina, no se sube a Git) pon o actualiza:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
2. Ejecuta:
   ```bash
   npm run deploy:env
   ```
   Eso sube las variables al Environment de Render y dispara un deploy.

### Opción B – Manual en Render

1. [Render Dashboard](https://dashboard.render.com) → tu servicio **bear-beat2027** → **Environment**.
2. Añade o edita:
   - `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` = `pk_live_...`
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...` (el del endpoint **Live**).
3. Guarda. Si hace falta, dispara un **Manual Deploy** para que el build use las nuevas vars.

---

## Paso 5: Activar SPEI (transferencias bancarias) – opcional

Si quieres ofrecer **SPEI** en el checkout, debes activar el método "Bank transfers" en Stripe:

1. Entra a **[Payment methods](https://dashboard.stripe.com/settings/payment_methods)** (Settings → Payment methods).
2. Busca **"Bank transfers"** y actívalo.
3. En algunas cuentas puede aparecer en **[Account settings → Payments](https://dashboard.stripe.com/account/payments/settings)**.

Si no está activado, al elegir SPEI el usuario verá un mensaje claro con el enlace para activarlo; mientras tanto puede usar Tarjeta, OXXO o PayPal.

**Link (pago rápido con tarjeta):** El checkout ya incluye Link cuando el cliente paga con tarjeta. Para que aparezca, actívalo en [Payment methods](https://dashboard.stripe.com/settings/payment_methods) → Link. Si está activo en tu cuenta, Stripe lo mostrará automáticamente en el flujo de tarjeta (MXN compatible).

---

## Paso 6: Comprobar

1. **Checkout:** Abre en producción `https://bear-beat2027.onrender.com/checkout` y haz un pago de prueba con tarjeta real (o OXXO/SPEI si ya los tienes en Live).
2. **Webhook:** En Stripe → Developers → Webhooks → tu endpoint Live → pestaña **Events**. Deberías ver el evento enviado y respuesta **200**.
3. **Flujo:** Tras pagar, redirect a `/complete-purchase` y que el pago aparezca como pendiente de completar; al activar, que quede en `purchases` y el usuario con acceso.

---

## Importante

- **No mezcles:** En producción usa **solo** claves Live (`pk_live_`, `sk_live_`) y un webhook creado en modo **Live** con su `whsec_...`. No uses claves de test ni el secreto de un webhook de test.
- **Un webhook por entorno:** Si quieres seguir probando en test, mantén un endpoint de webhook en modo **Test** (por ejemplo para local o staging) con su propio `whsec_...`; en Render solo el de Live.
- **URL del webhook:** Debe ser exactamente la de tu app en producción (Render o tu dominio). Si cambias de dominio, crea un nuevo endpoint en Stripe o edita la URL del existente.

---

## Resumen de variables

| Variable | Producción (Live) |
|----------|-------------------|
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (del webhook **Live**) |

Ver también: [WEBHOOK_STRIPE_CONFIG.md](./WEBHOOK_STRIPE_CONFIG.md), [PRUEBAS_STRIPE_Y_PAYPAL_SANDBOX.md](./PRUEBAS_STRIPE_Y_PAYPAL_SANDBOX.md).
