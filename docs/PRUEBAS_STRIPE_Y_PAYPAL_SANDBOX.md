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

### OXXO / SPEI (Stripe Checkout o Payment Element)

OXXO y SPEI (transferencia) en Stripe **requieren un Customer** asociado al pago. La app lo resuelve así:

- **Checkout (botones OXXO/SPEI):** En la página de checkout hay un campo **Email**. Es obligatorio para OXXO/SPEI (invitado o logueado). El backend busca o crea un Stripe Customer por ese email y lo asocia a la sesión.
- **Tarjeta + pestañas OXXO/SPEI:** Si eliges "Tarjeta" y en el Payment Element cambias a OXXO o SPEI, el backend ya creó un PaymentIntent con Customer usando el email (del usuario logueado o el que escribiste en el campo). Si pagas como invitado, **escribe tu email antes de elegir Tarjeta** para que OXXO/SPEI en las pestañas funcionen.

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

**Cómo probar en Bear Beat:**

1. Entra a **https://bear-beat2027.onrender.com/checkout** (o tu URL de producción).
2. Elige **PayPal** como método de pago.
3. Al hacer clic en el botón de PayPal, te redirigirá a **https://sandbox.paypal.com** (modo Sandbox).
4. Inicia sesión con tu cuenta **Personal** de Sandbox (ej. `sb-hho6h49170016@personal.example.com`) y la contraseña que configuraste en developer.paypal.com → Sandbox → Accounts.
5. Aprueba el pago en Sandbox. Te redirigirá de vuelta a `/complete-purchase` para completar datos y activar el acceso.

La cuenta Personal tiene saldo Sandbox (ej. USD 5,000); no se cobra dinero real.

---

## 3. Checklist rápido

- [ ] Stripe: `NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...` y `STRIPE_SECRET_KEY=sk_test_...`
- [ ] PayPal: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` y `PAYPAL_USE_SANDBOX=true` (credenciales de app Sandbox)
- [ ] (Opcional) `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=true` para mostrar el indicador de PayPal sandbox en el checkout
- [ ] En checkout ves el banner **"Modo pruebas"** cuando corresponde
- [ ] **Email en checkout:** Para OXXO/SPEI (invitado o logueado) rellenar el campo "Tu email" antes de elegir OXXO o SPEI
- [ ] Probar tarjeta con `4242 4242 4242 4242` y flujo completo hasta `/complete-purchase`
- [ ] Probar OXXO/SPEI: escribir email → elegir OXXO o SPEI → completar flujo hasta `/complete-purchase`
- [ ] Probar PayPal con una cuenta Sandbox y flujo hasta activación de compra

Cuando quieras cobros reales: cambia Stripe a claves `pk_live_` / `sk_live_`, PayPal a app **Live** y quita o pon `PAYPAL_USE_SANDBOX=false` según corresponda.

---

## 4. Qué activar en Stripe (Dashboard)

Para que las pruebas funcionen en producción (Render) o local:

1. **Modo Test:** En [dashboard.stripe.com](https://dashboard.stripe.com) activa el **interruptor "Test mode"** (arriba a la derecha). Debe estar en **Test** (no Live).
2. **API Keys:** En **Developers → API Keys** copia:
   - **Publishable key** (`pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
   - **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`
3. **Webhook (OXXO/SPEI y eventos):** En **Developers → Webhooks** (en modo Test):
   - **Solo necesitas UN destino** con URL: `https://bear-beat2027.onrender.com/api/webhooks/stripe`
   - **Evento obligatorio:** `checkout.session.completed` (la app Bear Beat solo usa este).
   - Si creaste dos webhooks con la misma URL, **quédate con uno** (ej. "bear2027") y borra el otro en Stripe para no liarte.
   - En la página del destino, copia el **Secreto de firma** (`whsec_...`).
   - En **Render → Environment** añade o edita: `STRIPE_WEBHOOK_SECRET` = ese `whsec_...` (pegado tal cual).
   - Opcional: en tu `.env.local` pon el mismo valor y ejecuta `npm run deploy:env` para subirlo a Render.

No hace falta “activar” sandbox aparte: con claves `pk_test_` / `sk_test_` Stripe ya opera en modo test.

---

## 5. Qué activar en PayPal (Developer Dashboard)

Para pruebas con PayPal Sandbox:

1. **Cuenta Developer:** Entra en [developer.paypal.com](https://developer.paypal.com) e inicia sesión.
2. **Apps & Credentials:** En **Sandbox** (pestaña Sandbox, no Live), crea una app o usa la predeterminada.
3. **Client ID y Secret:** Copia **Client ID** y **Secret** de esa app Sandbox.
   - Client ID → `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - Secret → `PAYPAL_CLIENT_SECRET`
4. **Modo Sandbox en la app:** En tu servidor/Render define:
   - `PAYPAL_USE_SANDBOX=true`
   - `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=true` (para que el checkout muestre el banner de pruebas).
5. **Cuentas de prueba:** En **Sandbox → Accounts** usa una cuenta **Personal** (comprador) para simular el pago en el flujo de PayPal. No se cobra dinero real.

No hay que “activar” sandbox en la web de PayPal: basta con usar la app **Sandbox** y las variables anteriores.

---

## 6. Activación en producción (Render)

Para que las pruebas corran en **bear-beat2027.onrender.com**:

1. **Stripe (test):** En Render → Environment, pon las claves **de test** de Stripe (`pk_test_...`, `sk_test_...`, `whsec_...` del webhook en modo Test).
2. **PayPal (sandbox):** En Render → Environment añade:
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID` = Client ID de la app Sandbox.
   - `PAYPAL_CLIENT_SECRET` = Secret de la app Sandbox.
   - `PAYPAL_USE_SANDBOX=true`
   - `NEXT_PUBLIC_PAYPAL_USE_SANDBOX=true`
3. **Subir variables:** Desde tu máquina, con las mismas claves en `.env.local`, ejecuta:  
   `npm run deploy:env`  
   para sincronizar las variables con Render.
4. **Redeploy:** Si cambias env en Render, haz un redeploy para que el build use las nuevas variables.

Tras el deploy, en `/checkout` deberías ver el banner **"Modo pruebas"** y poder probar con tarjeta `4242 4242 4242 4242` y con PayPal (cuenta Sandbox).
