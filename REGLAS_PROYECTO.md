# Reglas del proyecto – Bear Beat

**Source of Truth:** El código en `src/` es la verdad absoluta. La documentación debe describir lo que el código hace hoy, no lo que se planeó en el pasado.

---

## Prohibiciones (evitar regresiones)

1. **PROHIBIDO** volver a usar datos hardcoded para:
   - Conteo de videos (ej. 178, 3,000, 3,247).
   - Precios (ej. $350) como único valor en lógica de negocio.
   - Totales de géneros o tamaño del pack en la UI.

2. **Siempre** consultar la base de datos (Supabase) para:
   - Número de videos: tabla `videos` (por `pack_id`) o hook `useVideoInventory()`.
   - Info del pack: tabla `packs`; total de videos vía count en `videos`.
   - Usuario y compras: tablas `users`, `purchases`.

3. **Prioridad:** El flujo de producción es la prioridad. Cualquier cambio debe mantener funcionando:
   - Landing → Checkout → Pago → Complete-purchase → Dashboard / Contenido.
   - Descargas web (Bunny cuando esté configurado) y FTP (credenciales reales en `purchases`).

---

## Convenciones

- **Lenguaje en UI:** Humano, no técnico (ej. "Tus claves" en lugar de "Credenciales", "Mis Videos" en lugar de "Dashboard" cuando sea para el usuario final).
- **Errores:** Mensajes amables con solución inmediata (ej. "Tu tarjeta no pasó, intenta con OXXO").
- **Precio:** $350 MXN visible donde corresponda (hero, checkout, CTA móvil).
- **Pixel / conversiones:** El evento `Purchase` debe enviar valor dinámico (monto real), no fijo.

---

## Documentación de referencia

- **Estado actual del sistema:** `ESTADO_PROYECTO.md`
- **Inventario de páginas y APIs:** `INVENTARIO_COMPLETO_WEB.md`
- **Lanzamiento y env:** `CHECKLIST_LANZAMIENTO.md`
- **Base de datos:** `supabase/SETUP_COMPLETO.sql`

Cualquier programador nuevo debe poder leer estos archivos y entender cómo funciona el sistema **hoy**.
