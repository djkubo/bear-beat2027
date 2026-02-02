# Configurar webhook de Stripe para Bear Beat

La app solo usa **un evento**: `checkout.session.completed` (OXXO, SPEI, redirect de Stripe Checkout).

---

## Si tienes dos destinos con la misma URL

En Stripe puedes tener dos webhooks apuntando a `https://bear-beat2027.onrender.com/api/webhooks/stripe`. **Solo necesitas uno.**

1. **Quédate con uno** (ej. "bear2027").
2. En Stripe → **Developers → Webhooks** (modo **Test**), entra al destino que vayas a usar.
3. Comprueba que esté escuchando al menos **`checkout.session.completed`** (si no, edita y añade ese evento).
4. Copia el **Secreto de firma** (`whsec_...`).
5. En **Render** → tu servicio → **Environment**:
   - Añade o edita la variable **`STRIPE_WEBHOOK_SECRET`**.
   - Pega el valor del secreto de firma (ej. `whsec_zd6YWntZ3NSuYRo1T428slstWaPMkgHv`).
   - Guarda.
6. Opcional: **Elimina el otro webhook** en Stripe para no tener dos secretos distintos.

---

## Alternativa: subir el secreto con deploy:env

Si prefieres no tocar Render a mano:

1. En tu `.env.local` pon (o actualiza):  
   `STRIPE_WEBHOOK_SECRET=whsec_...`  
   (el mismo valor que copiaste en Stripe).
2. Ejecuta: **`npm run deploy:env`**
3. Eso sube las variables de `.env.local` a Render (incluido `STRIPE_WEBHOOK_SECRET`).

---

## Comprobar que funciona

1. Haz un pago de prueba (OXXO o SPEI en modo Test).
2. En Stripe → **Developers → Webhooks** → tu destino → pestaña **Eventos** deberías ver el evento enviado y la respuesta (200).
3. En la app, el pago debería aparecer como pendiente de completar en `/complete-purchase`.
