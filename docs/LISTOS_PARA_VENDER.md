# Listos para vender – Checklist final

## ✅ Hecho automáticamente

- **Render:** Variables de `.env.local` subidas a producción con `npm run deploy:env`. Deploy iniciado (Stripe, PayPal, Supabase, etc. ya están en el servicio).
- **Código:** Todo en `main`; Stripe (tarjeta, OXXO, SPEI), PayPal y flujo de compra listos para pagos reales.

---

## ⚠️ Una vez: Supabase Auth (Site URL + Redirect URLs)

Para que el login y los correos de recuperación de contraseña funcionen en producción:

### Opción A – Con script (recomendado)

1. Crea un **Personal Access Token** en Supabase:  
   [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Create token**.
2. En tu **`.env.local`** añade:
   ```env
   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx...
   ```
3. Ejecuta:
   ```bash
   npm run supabase:set-auth-urls
   ```
   Eso configura Site URL y Redirect URLs para `https://bear-beat2027.onrender.com`.

### Opción B – Manual en Supabase

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. **Authentication** → **URL Configuration**.
3. **Site URL:** `https://bear-beat2027.onrender.com`
4. **Redirect URLs:** añade `https://bear-beat2027.onrender.com/**` (y si quieres local: `http://localhost:3000/**`).
5. Guarda.

---

## Verificación rápida

| Dónde | Qué comprobar |
|-------|----------------|
| **Render** | Deploys → último deploy en curso o completado. Environment con Stripe (pk_live/sk_live si ya pasaste a Live), PayPal, NEXT_PUBLIC_APP_URL. |
| **Stripe** | Dashboard en modo **Live**; webhook apuntando a `https://bear-beat2027.onrender.com/api/webhooks/stripe` con evento `checkout.session.completed` y `payment_intent.succeeded`. |
| **PayPal** | En producción con `PAYPAL_USE_SANDBOX=false` y credenciales de app **Live**. |
| **Supabase** | Site URL y Redirect URLs configurados (script o manual). |
| **Sitio** | https://bear-beat2027.onrender.com/checkout → elegir Tarjeta, OXXO, SPEI o PayPal y que no salga error. |

Cuando Supabase Auth esté configurado (opción A o B), ya puedes vender con normalidad.
