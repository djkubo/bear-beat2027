# Checklist obligatorio: Supabase en producción

**Si la sesión no persiste en producción** (login y te vuelve a mandar a login), es casi siempre porque **Supabase Auth no tiene configurada la URL de tu sitio**. Haz esto **una sola vez** en el proyecto de Supabase que usa Render.

---

## 1. Entra al proyecto correcto

- Ve a **[Supabase Dashboard](https://supabase.com/dashboard)**.
- Abre el **mismo proyecto** cuyas variables usa tu app en Render (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 2. Site URL (obligatorio)

1. En el menú izquierdo: **Authentication** → **URL Configuration**.
2. En **Site URL** pon **exactamente**:
   ```text
   https://bear-beat2027.onrender.com
   ```
3. **Save**.

Si ahí pone `http://localhost:3000` o otra URL, las cookies de sesión no se asocian bien a tu dominio de producción.

---

## 3. Redirect URLs (obligatorio)

1. En la misma página **URL Configuration**.
2. En **Redirect URLs** asegúrate de tener **al menos**:
   ```text
   https://bear-beat2027.onrender.com/**
   ```
   y si quieres seguir usando local:
   ```text
   http://localhost:3000/**
   ```
3. **Add** cada una si no está.
4. **Save**.

Sin la URL de producción en la lista, los redirects tras login/OAuth pueden fallar y la sesión no se guarda.

---

## 4. Comprobar

1. Cierra sesión en **https://bear-beat2027.onrender.com** si estabas logueado.
2. Entra a **https://bear-beat2027.onrender.com/login**.
3. Inicia sesión con tu usuario (ej. test@bearbeat.com).
4. Deberías ir a dashboard o a la ruta que tengas tras login **sin** volver a la pantalla de login.

Si tras esto sigue fallando, revisa en Render que **NEXT_PUBLIC_APP_URL** sea `https://bear-beat2027.onrender.com` y que no haya errores en la pestaña Logs del servicio.

---

## Resumen

| Dónde | Qué |
|-------|-----|
| **Supabase** → Authentication → URL Configuration | **Site URL:** `https://bear-beat2027.onrender.com` |
| **Supabase** → Authentication → URL Configuration | **Redirect URLs:** incluir `https://bear-beat2027.onrender.com/**` |
| **Render** → Environment | **NEXT_PUBLIC_APP_URL:** `https://bear-beat2027.onrender.com` |

Con esto, la sesión de Supabase debería persistir en producción y el login/admin funcionar sin depender del bypass de cookie.
