# Limpieza y referencias – Bear Beat 2027

Registro de limpieza de código no usado y de referencias en la documentación para mantener datos y docs coherentes.

---

## 1. Código eliminado (limpieza realizada)

| Eliminado | Motivo |
|-----------|--------|
| `src/components/tracking/page-view-tracker.tsx` | Nunca importado. El tracking de página se hace con `trackPageView()` desde `src/lib/tracking.ts`, llamado directamente desde cada página (HomeLanding, checkout, contenido, dashboard, preview) y desde `TrackingScripts`. |
| `src/components/files/FileExplorer.tsx` | Nunca importado en la app. La carpeta `src/components/files/` quedó vacía (se puede eliminar el directorio si se desea). |

---

## 2. APIs sin uso desde la UI (uso manual o futuro)

Estas rutas no están enlazadas desde botones ni páginas; pueden usarse por URL directa o scripts:

| API | Uso posible |
|-----|-------------|
| `GET /api/tracks-pdf` | Genera PDF con listado de tracks por género (branding Bear Beat). Uso: abrir en navegador o enlazar desde contenido/dashboard si se añade botón "Descargar listado PDF". |
| `POST /api/setup/make-admin` | Asignar rol admin (setup inicial o recuperación). Uso: script o llamada manual. |
| `POST /api/setup-database` | Setup inicial de BD. Uso: script o despliegue inicial. |

No se han eliminado; se dejan disponibles. Si en el futuro se confirma que no se usarán, se pueden eliminar y actualizar [INDICE_COMPLETO.md](./INDICE_COMPLETO.md).

---

## 3. Documentación actualizada tras la limpieza

- **INVENTARIO_COMPLETO_WEB.md:** Eliminada la mención a `FileExplorer`; aclarado que el tracking de página se hace con `trackPageView()` y `TrackingScripts`.
- **FLUJO_SIN_FRICCION.md:** Actualizada la referencia al tracker de páginas (componente eliminado; se usa `trackPageView()` desde páginas y `TrackingScripts`).

---

## 4. Referencias a documentación en raíz

Los siguientes archivos en la raíz del proyecto están referenciados desde `docs/INDICE_COMPLETO.md` y `docs/README_DOCS.md`; deben existir para que los enlaces no queden rotos:

- `DOCUMENTACION_COMPLETA.md`
- `README.md`
- `RENDER_DEPLOY.md`
- `SISTEMA_AUTH_ADMIN.md`
- `SISTEMA_CHATBOT.md`
- `INTEGRACION_MANYCHAT.md`
- `SISTEMA_ATRIBUCION.md`

---

*Última actualización: eliminación de page-view-tracker y FileExplorer; actualización de INVENTARIO y FLUJO_SIN_FRICCION.*
