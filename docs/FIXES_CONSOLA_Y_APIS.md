# Fixes de consola y APIs – Bear Beat 2027

Documentación de las correcciones aplicadas para eliminar errores 404/502 en la consola del navegador (usuarios no pagadores) y mantener datos limpios en cliente.

---

## 1. Anuncios globales (global_announcements) – 404

**Problema:** El widget de chat intentaba leer la tabla `global_announcements` en Supabase desde el cliente. Si la tabla no existía o fallaba la consulta, Supabase devolvía 404 y la consola se llenaba de errores.

**Solución:**

- **Nueva API:** `GET /api/announcements`
  - **Archivo:** `src/app/api/announcements/route.ts`
  - Consulta en servidor con `createServerClient()` a `global_announcements`: `is_active = true`, orden por `created_at` desc, límite 1.
  - Si la tabla no existe (`PGRST116` o `42P01`) o hay cualquier error, devuelve `{ announcement: null }` sin lanzar 404.
- **Cliente:** `src/components/chat/ChatWidget.tsx` deja de consultar Supabase directamente para anuncios; llama a `GET /api/announcements` y usa el resultado. El resto del chat sigue usando Supabase donde corresponda.

**Respuesta API:** Siempre JSON: `{ announcement: <objeto | null> }`. El frontend no debe esperar 404; si no hay anuncio, `announcement` es `null`.

---

## 2. Logos compatibles (landing) – 404

**Problema:** La sección de logos (Serato, Rekordbox, VirtualDJ, etc.) intentaba cargar imágenes desde `/logos/<nombre>.png`. Varios archivos no existían, generando múltiples 404.

**Solución:**

- **Placeholder único:** Se creó `/public/logos/compatible-placeholder.svg` como imagen genérica para “compatible con”.
- **Componente:** `src/components/landing/compatible-logos.tsx` usa ese SVG como `src` para todos los logos (misma imagen para todos). Se eliminó la lógica de fallback a `.png` y a texto.
- **Instrucciones:** Siguen en `public/logos/README_COMPATIBLES.md` por si se quieren añadir logos reales más adelante.

---

## 3. Miniatura del hero (thumbnails-cache) – 404

**Problema:** El hero de la landing usaba una miniatura que no existía en `/public/thumbnails-cache/` (p. ej. `Reggaeton_Bad Bunny - Monaco.jpg`), produciendo 404.

**Solución:**

- En `src/components/landing/HomeLanding.tsx` se cambió la referencia de la imagen de fondo del hero a una miniatura que sí existe en `/public/thumbnails-cache/`, por ejemplo `Bachata_Dalvin La Melodia - Chiquilla Bonita (10A – 124 BPM).jpg`.
- Si se cambia de miniatura, usar siempre un archivo presente en `public/thumbnails-cache/` o en `public/` para evitar 404.

---

## 4. APIs demo y miniaturas – 502 (Bad Gateway)

**Problema:** Las rutas `/api/demo-url` y `/api/thumbnail-cdn` podían devolver 502 si Bunny CDN fallaba o las variables de entorno no estaban bien configuradas, sin respuesta JSON controlada.

**Solución:**

- **Try/catch de nivel superior** en ambas rutas:
  - `src/app/api/demo-url/route.ts`
  - `src/app/api/thumbnail-cdn/route.ts`
- Cualquier excepción no capturada se convierte en respuesta **503** con cuerpo JSON (p. ej. `{ error: "..." }`), nunca 502 sin cuerpo.
- **Validación de URL firmada:** Si la URL firmada de Bunny no es válida (no empieza por `http`), se devuelve 503 en lugar de redirigir, evitando respuestas rotas.

**Nota:** Los 502/503 en estas APIs solo se resuelven por completo si en producción (p. ej. Render) están bien configuradas las variables de Bunny CDN/FTP correspondientes.

---

## 5. Resumen de archivos tocados

| Área              | Archivos |
|-------------------|----------|
| Anuncios          | `src/app/api/announcements/route.ts` (nuevo), `src/components/chat/ChatWidget.tsx` |
| Logos             | `public/logos/compatible-placeholder.svg` (nuevo), `src/components/landing/compatible-logos.tsx` |
| Hero thumbnail    | `src/components/landing/HomeLanding.tsx` |
| Demo/thumbnail CDN| `src/app/api/demo-url/route.ts`, `src/app/api/thumbnail-cdn/route.ts` |

---

## 6. Índice de APIs relacionadas

- **GET `/api/announcements`** – Anuncio activo para el chat; ver §1 y [INDICE_COMPLETO.md](./INDICE_COMPLETO.md) §3.
- **GET `/api/demo-url`** – Redirect a demo en CDN; ver §4 y documentación de Bunny/Hetzner.
- **GET `/api/thumbnail-cdn`** – Miniatura vía CDN; ver §4.

---

*Última actualización: fixes consola (announcements, logos, hero, demo/thumbnail-cdn).*
