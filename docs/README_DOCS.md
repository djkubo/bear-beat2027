# Documentación Bear Beat

Índice de la documentación del proyecto. **Para desplegar a producción:** ver [DEPLOY_PRODUCCION.md](./DEPLOY_PRODUCCION.md).

---

## Embudo y producto

| Documento | Descripción |
|-----------|-------------|
| [EMBUDO_Y_SECCIONES_A_FONDO.md](./EMBUDO_Y_SECCIONES_A_FONDO.md) | **Fuente de verdad:** rutas (públicas/privadas/admin), APIs, modelo de datos, flujo completo landing → pago → activación → descarga. |
| [REPORTE_EMBUDO_PRODUCCION.md](./REPORTE_EMBUDO_PRODUCCION.md) | Mapa del embudo (journey + estados), matriz E2E (12+ escenarios), hallazgos/bugs priorizados, mejoras UX, checklist final. |
| [CRO_EMBUDO_COPY.md](./CRO_EMBUDO_COPY.md) | Copy y CRO del embudo. |

---

## Producción, auditoría y runbook

| Documento | Descripción |
|-----------|-------------|
| [DEPLOY_PRODUCCION.md](./DEPLOY_PRODUCCION.md) | **Guía de despliegue:** pasos para llevar el código a producción (Render), verificación post-deploy y rollback. |
| [AUDITORIA_PRODUCCION_Y_RUNBOOK.md](./AUDITORIA_PRODUCCION_Y_RUNBOOK.md) | Auditoría de producción, matriz de bugs, cambios implementados, checklist de variables, runbook (deploy, monitoreo, rollback). |
| [CHECKLIST_SUPABASE_PRODUCCION.md](./CHECKLIST_SUPABASE_PRODUCCION.md) | Checklist Supabase para producción (RLS, backups, webhooks). |
| [CHECKLIST_PARA_VENDER.md](./CHECKLIST_PARA_VENDER.md) | Checklist comercial para vender con el embudo. |

---

## Infra y servicios

| Documento | Descripción |
|-----------|-------------|
| [BUNNY_HETZNER_INTEGRACION.md](./BUNNY_HETZNER_INTEGRACION.md) | **Maestro:** Demos, portadas, descargas, descargas por carpeta, FTP – variables, estructura en Bunny/Hetzner, comprobaciones para que no haya fallos. |
| [BUNNY_PULL_ZONE_SETUP.md](./BUNNY_PULL_ZONE_SETUP.md) | Configuración Bunny CDN (pull zone, demos). |
| [HETZNER_FTP_REAL.md](./HETZNER_FTP_REAL.md) | FTP real con Hetzner Storage Box (subcuentas por compra). |
| [VIDEOS_HETZNER.md](./VIDEOS_HETZNER.md) | Videos y estructura en Hetzner. |
| [CONFIGURAR_RENDER_MCP_EN_CURSOR.md](./CONFIGURAR_RENDER_MCP_EN_CURSOR.md) | Configurar Render desde Cursor (MCP). |

---

## Contenido y admin

| Documento | Descripción |
|-----------|-------------|
| [METADATA_VIDEOS.md](./METADATA_VIDEOS.md) | Metadatos de videos (géneros, BPM, etc.). |
| [ADMIN_TEST_BEARBEAT.md](./ADMIN_TEST_BEARBEAT.md) | Usuarios de prueba y acceso admin. |

---

## Flujo recomendado para producción

1. Leer [EMBUDO_Y_SECCIONES_A_FONDO.md](./EMBUDO_Y_SECCIONES_A_FONDO.md) para entender el flujo.
2. Seguir [DEPLOY_PRODUCCION.md](./DEPLOY_PRODUCCION.md) para desplegar.
3. Usar [AUDITORIA_PRODUCCION_Y_RUNBOOK.md](./AUDITORIA_PRODUCCION_Y_RUNBOOK.md) para variables, monitoreo y rollback.
