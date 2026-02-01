# ¿Aguanta 1000 visitas/día y 300 descargas simultáneas?

## Respuesta corta

- **~1000 visitas diarias:** Sí, con la infra que tienes (Storage Box + VPS/Next.js).
- **~300 clientes descargando a la vez** (web + ZIP + FTP): **No** con solo Hetzner Storage Box. Ahí está el límite duro.

---

## El límite del Storage Box: 10 conexiones simultáneas

Según la documentación de Hetzner:

- **Storage Box:** máximo **10 conexiones simultáneas por cuenta** (FTP, WebDAV, SFTP, etc. comparten ese límite).
- Tráfico: **ilimitado** (no te cobran por GB de bajada).
- Subcuentas FTP: hasta 100, pero **todas comparten las mismas 10 conexiones** del Storage Box.

Por tanto:

- **Web (descarga por navegador):** cada descarga = 1 conexión WebDAV (Next.js → Storage Box → cliente). Máximo ~10 descargas web a la vez.
- **ZIP:** cada “Descargar todo” = 1 conexión por archivo que se va leyendo del Storage Box. También entra en el mismo límite de 10.
- **FTP:** cada cliente FTP conectado = 1 conexión. FTP + web + ZIP comparten las **mismas 10 conexiones**.

Con **solo** Storage Box + Next.js:

- **1000 visitas/día** está bien (picos de 10–50 concurrentes suelen ser manejables en tiempo, pero solo 10 pueden estar bajando a la vez desde el Box).
- **300 descargas simultáneas** no: a partir de la 11ª conexión el Storage Box no acepta más; el resto tendría que esperar o fallar.

---

## Qué aguanta la infra actual (solo Storage Box)

| Métrica                         | ¿Aguanta? | Notas                                      |
|---------------------------------|-----------|--------------------------------------------|
| ~1000 visitas/día               | Sí        | Picos repartidos en el día                 |
| ~10 descargas simultáneas (web) | Sí        | Límite del Storage Box                    |
| ~300 descargas simultáneas      | No        | Necesitas capa de entrega (CDN/object)    |
| FTP + web a la vez              | Sí, pero  | Entre todos siguen siendo 10 conexiones   |

---

## Cómo llegar a ~300 descargas simultáneas (web/ZIP)

Para ese nivel necesitas que **la descarga no pase toda por el Storage Box**. Opciones:

### 1. CDN como capa de entrega (recomendado)

- **Idea:** Los archivos se sirven desde un CDN (Bunny, Cloudflare, etc.). Next.js solo genera **URLs firmadas** (temporal, por usuario). El navegador descarga **directo del CDN**, no del Storage Box ni de tu VPS.
- **Conexiones:** Las 300 descargas las atiende el CDN (diseñado para miles de conexiones). El Storage Box solo se usa para **subir/sincronizar** contenido, no para servir cada descarga en tiempo real.
- En el proyecto ya tienes **Bunny.net** (lib y env). Se puede usar Bunny Storage + CDN como origen de descargas: subes (o sincronizas) los videos ahí y en `/api/download` en vez de hacer stream desde Hetzner devuelves una **redirect** o **URL firmada** a Bunny. Las descargas y el ZIP (si generas el ZIP desde Bunny o desde un job que prepare ZIPs en Bunny) salen del CDN.

### 2. Hetzner Object Storage + CDN

- Object Storage (S3-compatible) de Hetzner no tiene el límite de “10 conexiones” del Storage Box; está pensado para muchas peticiones.
- Flujo: copias/sincronizas contenido desde Storage Box → Object Storage; la app genera URLs firmadas o usa un CDN delante. Las descargas van al Object Storage / CDN, no al Storage Box.

### 3. Mantener FTP solo en Storage Box

- FTP puede seguir yendo **directo al Storage Box** (cada cliente = 1 de las 10 conexiones). Si quieres 300 usuarios usando **solo FTP** a la vez, tampoco basta con un solo Storage Box; seguirías limitado a 10 FTP simultáneos.
- Para muchos FTP simultáneos haría falta otro tipo de solución (por ejemplo, acceso vía SFTP a un VPS que tenga el contenido replicado, o aceptar cola de 10 y el resto en espera).

---

## Resumen práctico

| Objetivo                         | Con solo Storage Box + VPS | Con CDN (ej. Bunny) / Object Storage |
|----------------------------------|----------------------------|--------------------------------------|
| 1000 visitas/día                 | Sí                         | Sí                                   |
| ~10 descargas web simultáneas    | Sí                         | Sí                                   |
| ~300 descargas web simultáneas   | No                         | Sí                                   |
| 300 FTP simultáneos              | No (límite 10)             | N/A (FTP sigue al Box; otro diseño) |

Conclusión: **para “aguantar” 1000 visitas/día y 300 descargas simultáneas por web/ZIP**, necesitas una capa de entrega (CDN). **Ya está integrado Bunny CDN** (ver abajo).

---

## Bunny CDN integrado (listo para escalar)

Cuando configuras **Bunny** en `.env`, las descargas web y el ZIP usan Bunny en lugar del Storage Box:

| Recurso | Sin Bunny | Con Bunny configurado |
|---------|-----------|----------------------|
| **Descarga de un archivo** (`/api/download`) | Stream desde Hetzner (1 conexión por descarga) | **Redirect a URL firmada** → el usuario descarga directo del CDN (escala a cientos) |
| **ZIP** (`/api/download-zip`) | ZIP construido leyendo desde Hetzner (varias conexiones) | **ZIP construido leyendo desde Bunny Storage** (Bunny aguanta muchas conexiones) |

### Variables necesarias (Bunny)

- **Para descarga (redirect a CDN):** `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, `BUNNY_STORAGE_ZONE`
- **Para ZIP desde Bunny:** `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`

En el **Pull Zone** de Bunny: activa **Token Authentication** → **Advanced** (SHA256) y usa la misma clave que pones en `BUNNY_TOKEN_KEY`. Las URLs firmadas que genera la app usan SHA256; si usas solo Basic (MD5) no coincidirán.

### Sincronizar contenido Hetzner → Bunny

La estructura en Bunny debe ser la misma que en Hetzner (carpetas por género, videos dentro):

- `Reggaeton/video1.mp4`
- `Reggaeton/video2.mp4`
- `Pop/otro.mp4`
- etc.

Opciones:

1. **Subir manualmente** desde el panel de Bunny o con su API/FTP.
2. **rclone:** configurar origen = Hetzner Storage Box (WebDAV/SFTP) y destino = Bunny Storage (S3-compatible o FTP según lo que ofrezca Bunny); luego `rclone sync`.
3. **Script/job** en tu VPS que lea desde Hetzner y suba a Bunny (por ejemplo usando la API de Bunny que ya tienes en `src/lib/storage/bunny.ts`).

Con Bunny configurado y el contenido sincronizado, **las descargas web y el ZIP escalan** (Bunny/CDN aguanta cientos de conexiones). FTP sigue yendo al Storage Box (límite 10 conexiones simultáneas).
