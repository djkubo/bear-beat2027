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

---

## Pago correcto en Stripe pero el cliente no tiene acceso

Si un cliente pagó (Stripe muestra “Pago efectuado con éxito”) pero no se le activó la descarga, suele ser porque el webhook no llegó o falló (timeout, URL incorrecta, servicio dormido, etc.).

**Qué hacer:**

1. Entra como admin a **Panel → Compras pendientes** (`/admin/pending`).
2. Si el pago **sí aparece** en la lista “Pendientes de completar”: pulsa **Activar** en esa fila. Se crea el usuario si no existe y se activa el pack.
3. Si el pago **no aparece** (no hay fila en la base de datos):
   - En **Stripe Dashboard** abre ese pago.
   - En **Eventos** busca “Se completó una sesión de Checkout” y copia el **Session ID** (`cs_...`), o copia el **ID de pago** (`pi_...`) que ves en el resumen.
   - En `/admin/pending`, en el bloque **“Activar por ID de Stripe”**, pega ese ID (`cs_...` o `pi_...`) y pulsa **Activar compra**.
   - La app consulta Stripe, crea o localiza al usuario por email y activa la compra (acceso al pack y credenciales FTP si aplica).

Así puedes dar acceso manualmente sin reembolsar ni volver a cobrar.

---

## Cómo nos aseguramos de que no vuelva a fallar

1. **Reintentos del webhook**  
   Si la auto-activación falla (insert en `purchases`, usuario no encontrado, etc.), el webhook devuelve **500**. Stripe reintenta el evento varias veces. En cada reintento la app vuelve a intentar activar (idempotencia: si ya existe la compra no se duplica).

2. **Pendientes en base de datos**  
   Antes de activar, siempre se crea (o ya existe) una fila en `pending_purchases` con el pago. Si el webhook falla, esa fila queda en “Pendientes de completar” y puedes actuar desde el panel.

3. **Panel Admin → Reintentar todos**  
   En **Compras pendientes** (`/admin/pending`), si hay filas pendientes, aparece el botón **“Reintentar todos (N)”**. Al pulsarlo se llama a la misma lógica de activación para cada una. Úsalo si el webhook falló y Stripe ya no reintenta (p. ej. tras un fallo prolongado).

4. **Activar por ID de Stripe**  
   Si el pago no llegó ni a `pending_purchases` (webhook nunca ejecutado), pega el **Session ID** (`cs_...`) o **Payment Intent** (`pi_...`) en “Activar por ID de Stripe”. La app obtiene los datos desde Stripe (para `pi_` también busca la sesión de Checkout para el email) y activa la compra.

5. **Revisar pendientes**  
   Revisa de vez en cuando **Admin → Compras pendientes**. Si hay filas en “Pendientes de completar”, activa una por una o usa “Reintentar todos”.
