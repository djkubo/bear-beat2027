# Monitoreo de usuarios y errores – Bear Beat

Cuando llega mucho tráfico y los usuarios reportan bugs, necesitas ver **qué hicieron** y **qué falló**. Aquí tienes las herramientas ya integradas y cómo usarlas.

---

## 1. Mapas de calor y grabación de sesiones (Microsoft Clarity)

**Qué es:** Servicio gratuito de Microsoft que graba sesiones (clics, scroll, movimientos) y genera mapas de calor. Ves exactamente dónde hace clic la gente y en qué pantalla se quedó atascada.

**Qué hace en Bear Beat:**
- Se carga un script cuando configuras `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
- Las sesiones y heatmaps se ven en el dashboard de Clarity, no en tu admin.

**Configuración (una vez):**

1. Entra en **[clarity.microsoft.com](https://clarity.microsoft.com)** e inicia sesión con tu cuenta Microsoft.
2. Crea un proyecto y asigna la URL de tu sitio (ej. `https://bear-beat2027.onrender.com`).
3. Copia el **Project ID** (ej. `abc1def2g`).
4. En **Render** → Environment (o en `.env.local`):
   ```env
   NEXT_PUBLIC_CLARITY_PROJECT_ID=abc1def2g
   ```
5. Redeploy para que el script se incluya en el build.

**Dónde ver los datos:** [clarity.microsoft.com](https://clarity.microsoft.com) → tu proyecto → Dashboard (sesiones), Heatmaps, Recordings.

**Uso típico:** Un usuario dice “el botón de descargar no me funciona”. Buscas su sesión por hora/URL, ves la grabación y compruebas si hizo clic, si hubo error en pantalla, etc.

---

## 2. Errores de JavaScript y React (Admin → Tracking)

**Qué hace la app:**
- **Errores no capturados** (`window.onerror`) y **promesas rechazadas** (`unhandledrejection`) se envían a tu API y se guardan en Supabase como eventos con:
  - `event_type`: `client_error` o `client_promise_rejection`
  - `event_data`: mensaje, stack (primeros ~1500 caracteres), URL, etc.
- **Errores de React** (componente que lanza en render) los captura un Error Boundary y se guardan como:
  - `event_type`: `react_error`
  - `event_data`: mensaje, stack, componentStack, URL.

**Dónde verlos:**
1. Entra en **Admin** → **Tracking** (o **Atribución** si prefieres la tabla por fuente).
2. En la sección **“Timeline de Eventos”** verás los últimos 100 eventos.
3. Los errores aparecen con icono ❌ / ⚠️ / 🔴 y borde rojo/ámbar.
4. Abre **“Ver datos”** en el evento para ver `event_data` (mensaje, stack, página).

**Cómo corregir el bug:**
- `event_name` suele ser el mensaje del error (ej. “Cannot read property 'x' of undefined”).
- `event_data.stack` o `event_data.componentStack` te dan la línea/componente.
- Reproduce en local si puedes (misma ruta, mismo flujo) y corrige. Luego sube a producción.

---

## 3. Eventos de negocio (Admin → Tracking y Atribución)

Ya tienes en **user_events** (Supabase):
- `page_view`, `click_cta`, `start_checkout`, `payment_success`, `registration`, `login`, etc.
- Atribución (UTM, fuente) en **Admin → Atribución**.

Sirven para ver embudo (Tracking) y de dónde viene el tráfico que convierte (Atribución). No sustituyen a Clarity para “ver la sesión” ni a los eventos de error para depurar bugs.

---

## 4. Errores del servidor (Render)

**API (Next.js, Rutas API):**
- Si una ruta API lanza excepción o devuelve 500, Render lo registra en **Logs**.
- En **Render** → tu servicio → **Logs** (y, si usas, **Metrics**) ves el stack trace y el momento del fallo.

**Cómo usarlo:** Si un usuario dice “al pagar me salió error”, revisa:
1. **Admin → Tracking** por eventos `client_error` / `react_error` en esa hora.
2. **Render → Logs** por 500 o excepciones en `/api/create-checkout`, `/api/webhooks/stripe`, etc.

---

## Resumen rápido

| Objetivo | Dónde |
|----------|--------|
| Ver qué hace el usuario (clics, scroll, pantalla) | **Microsoft Clarity** (mapas de calor + grabaciones) |
| Ver errores de JS/React en el navegador | **Admin → Tracking** (eventos `client_error`, `react_error`, `client_promise_rejection`) |
| Ver embudo y conversiones | **Admin → Tracking** (funnel) y **Atribución** |
| Ver fallos del servidor/API | **Render → Logs** |

**Checklist para cuando reporten un bug:**
1. Buscar en **Admin → Tracking** por la hora aproximada y filtrar por tipo de evento (o por URL en `event_data.pageUrl`).
2. Si tienes Clarity, abrir la sesión de ese usuario (misma hora/URL) y ver la grabación.
3. Revisar **Render → Logs** por esa franja horaria si el fallo pudo ser en API.
4. Corregir, hacer deploy y, si aplica, contestar al usuario.
