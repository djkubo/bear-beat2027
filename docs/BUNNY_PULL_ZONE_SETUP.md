# Configurar Pull Zone en Bunny.net (demos / CDN)

Para que los demos apunten a `https://tu-zona.b-cdn.net` y no den 503 en Next.js.

**En Bear Beat todo está en Hetzner.** Configura la Pull Zone con **Origin URL = tu Hetzner Storage Box (WebDAV)** para que Bunny jale los archivos de Hetzner. Ver [BUNNY_ORIGEN_HETZNER.md](./BUNNY_ORIGEN_HETZNER.md).

**Documento maestro:** [BUNNY_HETZNER_INTEGRACION.md](./BUNNY_HETZNER_INTEGRACION.md).

---

## Qué hace Bunny (instrucción oficial)

> *"Replace the URLs pointing to your static files with your bunny.net hostname. We will automatically download and cache your files on our servers."*

En Bear Beat **ya está hecho en código**: las URLs de los videos de demo apuntan al hostname de Bunny, no a tu servidor Next.js.

| Antes (proxy Next.js → 503) | Después (CDN directo) |
|-----------------------------|------------------------|
| `https://bear-beat2027.onrender.com/api/demo/Bachata/Video%20Demo.mp4` | `https://bearbeat.b-cdn.net/Bachata/Video%20Demo.mp4` |

- **Origen** que Bunny usará para cachear (si eliges “Origin URL”): tu sitio, ej. `https://bear-beat2027.onrender.com`.
- **Hostname Bunny**: el que elijas al crear la Pull Zone, ej. `https://bearbeat.b-cdn.net`.
- En el front solo se usa el hostname de Bunny para el `src` del `<video>` (vía `BUNNY_CDN_URL` y `/api/cdn-base`).

---

## 1. Pull Zone Name (obligatorio)

**Solo letras y números.** Será tu hostname: `[nombre].b-cdn.net`.

Ejemplos:
- `bearbeat` → `https://bearbeat.b-cdn.net`
- `bearbeat2027` → `https://bearbeat2027.b-cdn.net`

Elige uno y úsalo siempre (luego lo pones en `BUNNY_CDN_URL`).

---

## 2. Origin type y Origin URL

Depende de dónde estén los videos:

### Opción A: Tus archivos están en **Bunny Storage** (recomendado)

1. En **Origin type** elige **Storage Zone** (o “Bunny Storage”) si aparece.
2. Selecciona tu **Storage Zone** (ej. `bear-beat`, el mismo que tienes en `BUNNY_STORAGE_ZONE`).
3. No hace falta rellenar “Origin URL” como tal; Bunny enlaza la Pull Zone con la Storage.

Así los archivos que subas a la Storage Zone se sirven por `https://[tu-pull-zone].b-cdn.net`.

### Opción B: Solo te deja “Origin URL” (sitio web)

Si el formulario **obliga** a poner una URL de origen:

- **Origin URL:** `https://bear-beat2027.onrender.com`  
  (o la URL de donde Bunny pueda “pull” los archivos la primera vez).

En ese caso Bunny cachea lo que pida desde esa URL. Para demos pesados suele ser mejor usar **Storage Zone** (Opción A) y subir los vídeos ahí.

---

## 3. Host header (opcional)

Puedes dejarlo **vacío**.  
Si más adelante tu origen exige un host concreto, lo indicas aquí.

---

## 4. Tier y Pricing zones

- **Tier:** El de “small files, websites” ($10/TB) suele bastar para empezar.
- **Zonas:** Para público en **México / LATAM**:
  - **North America** ($0.01/GB) – México suele ir por ahí.
  - **South America** ($0.045/GB) – resto LATAM.
- Si tienes usuarios en Europa, activa **Europe** ($0.01/GB).

---

## 5. Después de crear la Pull Zone

1. En el dashboard de Bunny copia la **URL del CDN** (ej. `https://bearbeat.b-cdn.net`).
2. En tu proyecto:
   - **.env.local:**  
     `BUNNY_CDN_URL=https://bearbeat.b-cdn.net`  
     (sin barra final; usa tu nombre real de Pull Zone).
   - Luego: `npm run deploy:env` para subir la variable a Render.

Con eso el front ya usará esa URL para los demos (vía `/api/cdn-base` y `getDemoCdnUrl`).
