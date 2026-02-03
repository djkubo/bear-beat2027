# Panel Admin – Estado actual y pendientes

**Objetivo:** Una sola referencia de qué está hecho y qué se suele pedir o falta.

---

## ✅ Lo que SÍ está implementado

| Sección | Ruta | Qué hace |
|--------|------|----------|
| **Dashboard** | `/admin` | KPIs (usuarios, ingresos, packs vendidos, conversión), Fuentes de Tráfico, Sync FTP, Últimas 10 compras, búsqueda rápida a usuarios. |
| **Usuarios** | `/admin/users` | Lista de usuarios (email, país, compras). Búsqueda por query. |
| **Usuario detalle** | `/admin/users/[id]` | Detalle de un usuario (perfil, compras, credenciales FTP). |
| **Compras** | `/admin/purchases` | Historial de compras (tabla con usuario, pack, monto, fecha). |
| **Packs** | `/admin/packs` | Lista de packs con ventas, videos, tamaño, estado. **Solo lectura.** Botones "Crear", "Editar", "Ver" son solo UI (no llevan a formularios). |
| **Pendientes** | `/admin/pending` | Compras en `pending_purchases` (status awaiting_completion). |
| **Tracking** | `/admin/tracking` | Eventos de usuarios (user_events, etc.). |
| **Atribución** | `/admin/attribution` | Atribución First-Touch por compras. |
| **Chatbot** | `/admin/chatbot` | Métricas del bot, intents, mensajes sin intención, Analyze-chat (IA). |
| **ManyChat** | `/admin/manychat` | Integración ManyChat. |
| **Mensajes** | `/admin/mensajes` | Enviar mensajes (email / push) a usuarios. |
| **Push** | `/admin/push` | Notificaciones push (estadísticas, envío). |
| **Config** | `/admin/settings` | Texto explicando que la config está en variables de entorno (Render / .env.local). No hay formulario de ajustes en BD. |

**Navegación:** Desde `/admin` hay enlaces a las 11 secciones anteriores (incl. Mensajes y Push).

---

## ⏳ Pendiente / típicamente pedido

1. **Packs – CRUD real**
   - **Crear pack:** Formulario (nombre, slug, precio, fecha, estado) + API que inserte en `packs`.
   - **Editar pack:** Ruta `/admin/packs/[id]/edit` con formulario y API PATCH.
   - **Ver pack:** Ruta `/admin/packs/[id]` con detalle (videos del pack, compras).

2. **Estadísticas de descargas**
   - Si existe tabla `downloads` (o similar): vista en admin de descargas por usuario/archivo/fecha.
   - Gráfica o tabla “videos más descargados” (ya hay `/api/videos/popular` que se puede usar).

3. **Settings desde BD**
   - Tabla `settings` (key/value) y pantalla en `/admin/settings` para editar (ej. texto de garantía, límites, flags). Opcional.

4. **Bundles**
   - Si el negocio usa “bundles” (varios packs empaquetados): CRUD de bundles y asignación de packs. Hoy no hay modelo de bundles en el proyecto.

5. **Exportar datos**
   - Export CSV/Excel de usuarios o compras desde `/admin/users` y `/admin/purchases`.

6. **Anuncios globales (chat)**
   - Ya existe flujo de `global_announcements` para el BearBot. Si se pidió “gestionar anuncios desde admin”, falta una pantalla `/admin/announcements` (listar, crear, activar/desactivar).

7. **Otros**
   - Cualquier otra petición concreta (ej. “ver logs de webhooks”, “reintentar envío de email”, “marcar compra como reembolsada”) se puede añadir a esta lista cuando la indiques.

---

## Cómo seguir

- Si recuerdas **qué cosas concretas pediste** para el admin (ej. “editar packs”, “ver descargas”, “anuncios”), dímelas y las implementamos en este orden.
- Si no recuerdas, podemos ir implementando por prioridad: primero **CRUD de Packs** (crear/editar/ver), luego **estadísticas de descargas** (si hay datos), y después lo que tú priorices.

Referencia de rutas y APIs: `docs/INDICE_COMPLETO.md` y `DOCUMENTACION_COMPLETA.md` §11 (Admin).
