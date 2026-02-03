# Supabase: que no falte nada en producción

Checklist para tener **todo** lo que usa la app en tu proyecto de Supabase.

---

## 1. Base (obligatorio)

**Archivo:** `supabase/SETUP_COMPLETO.sql`

Incluye: `users`, `packs`, `genres`, `videos`, `purchases`, `pending_purchases`, `user_events`, `push_subscriptions`, `push_notifications_history`, `ftp_pool`, `conversations`, `messages`, RLS, `is_admin()`, `get_admin_stats()`, datos iniciales (géneros + pack Enero 2026).

**Si ya lo ejecutaste:** bien. Si no, ejecuta **todo** el archivo en **SQL Editor** → Run.

---

## 2. Tablas y funciones que NO están en SETUP_COMPLETO

La app usa estas cosas que viven en otros archivos. Si no las ejecutaste, algo puede fallar (descargas, push, chat, admin atribución, etc.).

| Qué | Para qué | Archivo |
|-----|----------|---------|
| **downloads** | Historial de descargas (web/FTP) en `/api/download` y `/api/files` | `supabase/PENDIENTES_SUPABASE.sql` |
| **global_announcements** | Anuncios en el chat (ChatWidget) | `supabase/migrations/20260203100000_global_announcements.sql` |
| **chat_messages** | Mensajes del BearBot (chat web) | `supabase/migrations/20260202100000_chat_messages_web.sql` |
| **documents** + **match_documents** | RAG del chatbot (búsqueda semántica) | `supabase/migrations/20260130200001_vector_knowledge_fix.sql` |
| **get_traffic_stats**, **get_top_campaigns** | Admin → Fuentes de tráfico | `supabase/schema_attribution.sql` |
| **get_funnel_stats** | Admin → Tracking / embudo | `supabase/schema_tracking.sql` |
| **get_chatbot_stats**, **get_or_create_conversation**, **knowledge_base**, **bot_actions** | Admin → Chatbot, ManyChat | `supabase/schema_chatbot.sql` |
| **Videos: unique(pack_id, file_path)** | Sync desde FTP sin duplicados | `supabase/migrations/20260203000000_videos_unique_pack_file.sql` |
| **Atribución en purchases** | UTM en compras | `supabase/migrations/20260130000000_add_purchases_attribution.sql` (o ya en SETUP_COMPLETO según versión) |

---

## 3. Orden recomendado en SQL Editor (si algo falta)

Ejecutar **uno por uno** en este orden (si ya existe, Supabase suele decir "already exists" y no pasa nada):

1. `supabase/SETUP_COMPLETO.sql` (si no lo has ejecutado nunca)
2. `supabase/PENDIENTES_SUPABASE.sql` (tabla **downloads**)
3. `supabase/migrations/20260130000000_add_purchases_attribution.sql`
4. `supabase/migrations/20260130200000_vector_knowledge.sql` (o `20260130200001_vector_knowledge_fix.sql` si usas vector)
5. `supabase/migrations/20260131000000_add_videos_key_bpm.sql`
6. `supabase/migrations/20260202000000_push_subscriptions_rls.sql`
7. `supabase/migrations/20260202100000_chat_messages_web.sql`
8. `supabase/migrations/20260203000000_videos_unique_pack_file.sql`
9. `supabase/migrations/20260203100000_global_announcements.sql`
10. `supabase/schema_attribution.sql` (get_traffic_stats, get_top_campaigns)
11. `supabase/schema_tracking.sql` (get_funnel_stats)
12. `supabase/schema_chatbot.sql` (chatbot completo: get_chatbot_stats, get_or_create_conversation, knowledge_base, bot_actions, etc.)

---

## 4. Auth (login en producción)

En **Authentication** → **URL Configuration**:

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://bear-beat2027.onrender.com` (o tu dominio) |
| **Redirect URLs** | `https://bear-beat2027.onrender.com/**` y, si quieres local: `http://localhost:3000/**` |

Sin esto, el login en producción puede redirigir mal o pedir login otra vez.

---

## 4.1 Emails de contraseña y confirmación (que SÍ lleguen)

Si los usuarios dicen que **no les llega el email** de recuperar contraseña o de confirmación:

1. **URL Configuration (obligatorio)**  
   - **Site URL** = tu app en producción, ej. `https://bear-beat2027.onrender.com`  
   - **Redirect URLs** debe incluir tu dominio con `/**` (ej. `https://bear-beat2027.onrender.com/**`).  
   Sin esto, Supabase puede no generar bien el enlace del correo o el enlace falla al abrir.

2. **Plantillas de email**  
   - **Authentication** → **Email Templates**.  
   - Revisa **Confirm signup** y **Reset Password**: que estén habilitadas y con asunto/cuerpo válidos (puedes personalizar el texto).  
   - El enlace de confirmación debe usar `{{ .ConfirmationURL }}` y el de reset `{{ .ConfirmationURL }}` (o lo que indique la plantilla por defecto).

3. **Proveedor de email (recomendado)**  
   Por defecto Supabase envía desde `noreply@mail.app.supabase.io` y muchos correos caen en **Spam**. Para que lleguen bien:  
   - **Project Settings** (engranaje) → **Auth** → **SMTP Settings**.  
   - Activa **Custom SMTP** y configura con Resend, SendGrid, etc. (ej. Resend: host `smtp.resend.com`, puerto 465, user `resend`, password = API key, sender = un email verificado como `noreply@tudominio.com`).

4. **Variable en producción**  
   En Render (o tu hosting): **NEXT_PUBLIC_APP_URL** = `https://bear-beat2027.onrender.com` (sin barra final). Así el enlace del correo apunta siempre a tu sitio.

5. **Si sigue sin llegar**  
   En Supabase: **Logs** → **Auth** y revisa si hay errores al enviar el email. Comprueba también la carpeta **Spam / Promociones** del usuario.

---

## 5. Usuario admin

- Crear usuario en **Authentication** → Users (o registrarse en la app).
- En **SQL Editor**:
  ```sql
  UPDATE public.users SET role = 'admin' WHERE email = 'tu@email.com';
  ```
- Opcional: usar **/fix-admin?token=bearbeat-admin-2027-secreto** (con `FIX_ADMIN_SECRET` en Render).

---

## 6. Resumen “¿Me falta algo?”

- **Solo ventas y contenido:** SETUP_COMPLETO + **downloads** (y Auth URLs) suele bastar.
- **Descargas:** hace falta la tabla **downloads** (y que el usuario tenga compra).
- **Push desde admin:** la app usa la tabla **push_notifications_history** (ya está en SETUP_COMPLETO).
- **Chat web (BearBot):** **chat_messages** + **documents** + **match_documents** (y OpenAI configurado).
- **Admin → Fuentes de tráfico:** **schema_attribution.sql**.
- **Admin → Tracking / embudo:** **schema_tracking.sql**.
- **Admin → Chatbot / ManyChat:** **schema_chatbot.sql**.

Si al usar una función (descargar, enviar push, abrir chat, ver atribución) ves error de “relation does not exist” o “function does not exist”, ejecuta el archivo de la tabla anterior que corresponda.
