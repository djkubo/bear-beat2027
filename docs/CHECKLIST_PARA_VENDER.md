# Checklist para que la web esté vendiendo

**Objetivo:** Verificar que un cliente puede pagar, recibir acceso y descargar. Haz estas pruebas **una vez** después de cada deploy importante.

---

## 1. Variables de entorno en Render (críticas)

En **Render** → tu servicio → **Environment**, deben existir:

| Variable | Para qué |
|----------|----------|
| `NEXT_PUBLIC_APP_URL` | `https://bear-beat2027.onrender.com` (o tu dominio) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Para webhooks y activate (admin) |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe (empieza por `whsec_`) |
| `BUNNY_CDN_URL` / `BUNNY_TOKEN_KEY` | Para descargas en producción (si usas Bunny) |

Si falta alguna, el pago o las descargas pueden fallar.

---

## 2. Supabase – URLs de autenticación

En **Supabase** → **Authentication** → **URL Configuration**:

- **Site URL:** `https://bear-beat2027.onrender.com`
- **Redirect URLs:** incluir `https://bear-beat2027.onrender.com/**`

Si no está bien, el login en producción no persiste y el usuario vuelve al login.

---

## 3. Stripe – Webhook

En **Stripe Dashboard** → **Developers** → **Webhooks**:

- Debe haber un endpoint apuntando a:  
  `https://bear-beat2027.onrender.com/api/webhooks/stripe`
- Evento: **checkout.session.completed**
- El **Signing secret** (`whsec_...`) debe estar en Render como `STRIPE_WEBHOOK_SECRET`

Sin esto, el pago se cobra pero no se crea la compra pendiente ni se activa el acceso.

---

## 4. Prueba de punta a punta (flujo de venta)

1. **Landing:** Abre `https://bear-beat2027.onrender.com` → debe cargar la página y el botón de compra.
2. **Checkout:** Clic en comprar → debe llevarte a Stripe (o página de checkout).
3. **Pago de prueba:** Usa tarjeta de test de Stripe (ej. `4242 4242 4242 4242`) y completa el pago.
4. **Post-pago:** Después de pagar, debes llegar a `/complete-purchase` (completar email/nombre si pide).
5. **Activar:** Al completar, debe mostrarse mensaje de éxito y botón para ir al dashboard o contenido.
6. **Acceso:** Entra a **Contenido** o **Dashboard** → debe verse el pack y la opción de descargar.
7. **Descarga:** Prueba descargar un archivo → debe generar enlace o descarga correcta.

Si algo falla en los pasos 4–7, revisa logs en Render y en Stripe (webhooks).

---

## 5. Bug corregido (descargas)

La tabla `purchases` **no tiene** columna `status`. El código que filtraba por `status = 'completed'` en `/api/files` se ha quitado: **tener una fila en `purchases` para ese usuario y pack ya cuenta como acceso**. Si antes los compradores no podían descargar, con este cambio debería funcionar.

---

## Resumen

- **Variables** en Render completas.
- **Supabase** con Site URL y Redirect URLs de producción.
- **Stripe** con webhook apuntando a tu dominio y secret en Render.
- **Prueba** un pago de punta a punta (pagar → completar → entrar → descargar).

Si todo esto está bien, la web está en condiciones de vender.
