# Guía paso a paso – Bear Beat en producción (desde cero)

Guía para llevar Bear Beat a internet aunque no sepas nada de servidores. Sigue los pasos en orden.

---

## Qué vas a necesitar (cuentas)

| Qué | Para qué |
|-----|----------|
| **Hetzner** (Storage Box) | Donde guardas los videos y los clientes descargan por web y FTP |
| **Supabase** | Usuarios (registro/login) y base de datos |
| **PayPal** | Cobrar a los clientes |
| **Bunny** (opcional) | Para muchas descargas a la vez (si esperas muchos usuarios) |
| **Un lugar donde corra la web** | Vercel, Railway o un VPS (te digo cuál elegir más abajo) |
| **Un dominio** (opcional al inicio) | Ej. bearbeat.com; al principio puedes usar la URL que te den Vercel/Railway |

---

# PARTE 1 – Probar la web en tu computadora

## Paso 1.1 – Instalar Node.js

1. Entra a: **https://nodejs.org**
2. Descarga la versión **LTS** (botón verde).
3. Instala (siguiente, siguiente, terminar).
4. Abre una **terminal** (en Mac: Buscar “Terminal”; en Windows: Buscar “Símbolo del sistema” o “PowerShell”).
5. Escribe: `node -v` y Enter. Debe salir un número (ej. v20.10.0). Si sale error, reinstala Node.

## Paso 1.2 – Abrir el proyecto e instalar dependencias

1. En la terminal, ve a la carpeta del proyecto. Ejemplo (cambia la ruta por la tuya):
   ```bash
   cd "C:\Users\TuUsuario\Documents\BEAR BEAT 2027 3.0"
   ```
   En Mac:
   ```bash
   cd "/Users/tu_usuario/Documents/CURSOR/BEAR BEAT 2027 3.0"
   ```
2. Instala las dependencias:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Espera a que termine (puede tardar 1–2 minutos).

## Paso 1.3 – Crear el archivo de variables (.env.local)

1. En la carpeta del proyecto, busca el archivo **`.env.example`** (o créalo si no existe).
2. **Cópialo** y **renómbralo** a: **`.env.local`**
   - En Windows: clic derecho → Copiar, luego Pegar y renombrar la copia a `.env.local`
   - En Mac: en Terminal: `cp .env.example .env.local`
3. Abre **`.env.local`** con el Bloc de notas o con Cursor/VS Code. Lo irás rellenando en los siguientes pasos.

---

# PARTE 2 – Hetzner (donde están los videos)

## Paso 2.1 – Tener una Storage Box en Hetzner

1. Entra a **https://www.hetzner.com/storage/storage-box**
2. Si no tienes cuenta, regístrate y contrata una **Storage Box** (la más pequeña sirve para empezar).
3. En el panel de Hetzner (Robot o Cloud Console), anota:
   - **Host:** algo como `u540473.your-storagebox.de`
   - **Usuario:** el usuario principal (ej. `u540473`)
   - **Contraseña:** la que pusiste al crear la Storage Box

## Paso 2.2 – Subir los videos por FTP

1. Instala **FileZilla** (o similar): **https://filezilla-project.org**
2. Conéctate a tu Storage Box:
   - Host: `u540473.your-storagebox.de` (usa tu host)
   - Usuario: tu usuario
   - Contraseña: tu contraseña
   - Puerto: **22** (SFTP) o **21** (FTP)
3. Crea **carpetas por género**, por ejemplo:
   - `Reggaeton`
   - `Pop`
   - `Cumbia`
4. Dentro de cada carpeta sube los archivos **.mp4** (y si quieres una imagen de portada con el mismo nombre, ej. `video1.jpg`).

La estructura debe quedar así:
```
Reggaeton/
  video1.mp4
  video2.mp4
Pop/
  otro.mp4
```

## Paso 2.3 – Poner Hetzner en .env.local

Abre **`.env.local`** y rellena (con tus datos reales):

```
HETZNER_STORAGEBOX_HOST=u540473.your-storagebox.de
HETZNER_STORAGEBOX_USER=u540473
HETZNER_STORAGEBOX_PASSWORD=tu_contraseña_aqui
```

Guarda el archivo.

---

# PARTE 3 – Supabase (usuarios y base de datos)

## Paso 3.1 – Crear proyecto en Supabase

1. Entra a **https://supabase.com** e inicia sesión (o regístrate).
2. Clic en **New project**.
3. Pon nombre (ej. `bear-beat`), contraseña para la base de datos (guárdala) y región. Clic en **Create project**.
4. Espera a que el proyecto esté listo (1–2 minutos).

## Paso 3.2 – Obtener las claves (URL y keys)

1. En el proyecto, ve a **Settings** (icono de engrane) → **API**.
2. Ahí verás:
   - **Project URL** (ej. `https://xxxxx.supabase.co`)
   - **anon public** (clave pública)
   - **service_role** (clave secreta; no la compartas)
3. Copia esos tres valores.

## Paso 3.3 – Crear las tablas en Supabase

1. En Supabase, ve a **SQL Editor**.
2. Abre en tu proyecto el archivo **`supabase/SETUP_COMPLETO.sql`** (o **`supabase/schema.sql`** y los que digan “crear tablas”).
3. Copia todo el contenido del SQL y pégalo en el SQL Editor de Supabase.
4. Clic en **Run**. Debe decir que se ejecutó bien (si sale algún error, copia el mensaje y búscalo o pide ayuda).

## Paso 3.4 – Poner Supabase en .env.local

En **`.env.local`** añade (con tus valores):

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=la_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=la_service_role_key
```

Guarda el archivo.

---

# PARTE 4 – PayPal (cobros)

## Paso 4.1 – Cuenta de desarrollador y app

1. Entra a **https://developer.paypal.com** e inicia sesión con tu cuenta PayPal.
2. Ve a **Dashboard** → **My Apps & Credentials**.
3. En **Sandbox** (pruebas): crea una app si no tienes. Ahí te dan **Client ID** y **Secret**.
4. Para producción: cambia a **Live** y crea una app (o usa la misma). Copia **Client ID** y **Secret** de Live.

## Paso 4.2 – Poner PayPal en .env.local

En **`.env.local`** añade:

```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id
PAYPAL_CLIENT_SECRET=tu_secret
```

Para probar en local usa los de **Sandbox**; cuando pongas la web en producción, usa los de **Live**.  
Guarda el archivo.

---

# PARTE 5 – Probar en tu computadora

## Paso 5.1 – URL de la app en .env.local

En **`.env.local`** pon (para probar en tu PC):

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Guarda.

## Paso 5.2 – Arrancar la web

1. En la terminal, dentro de la carpeta del proyecto, escribe:
   ```bash
   npm run dev
   ```
2. Espera a que diga algo como “Ready on http://localhost:3000”.
3. Abre el navegador y entra a: **http://localhost:3000**

Deberías ver la página de Bear Beat. Si entras a la sección de contenido/videos, deberían listarse los que subiste a Hetzner (si Hetzner y Supabase están bien en `.env.local`).

Si sale error 503 en videos: revisa que **HETZNER_STORAGEBOX_HOST**, **USER** y **PASSWORD** estén bien en `.env.local` y que hayas guardado el archivo.

---

# PARTE 6 – Subir la web a internet (elegir dónde)

Tienes tres opciones. La más fácil para empezar es **Vercel**.

## Opción A – Vercel (la más fácil)

1. Entra a **https://vercel.com** e inicia sesión (puedes con GitHub).
2. Clic en **Add New** → **Project**.
3. Conecta tu repositorio de GitHub (si el proyecto está en GitHub). Si no, instala **Vercel CLI** y en la carpeta del proyecto ejecuta: `npx vercel` y sigue los pasos.
4. Antes de desplegar, en **Settings** → **Environment Variables** añade **todas** las variables que tienes en `.env.local` (una por una: nombre y valor).  
   Importante: **NEXT_PUBLIC_APP_URL** en producción debe ser la URL que te dé Vercel, ej. `https://tu-proyecto.vercel.app`.
5. Despliega (Deploy). Vercel te dará una URL tipo `https://bear-beat-xxx.vercel.app`.

**Limitación en Vercel:** no tiene ffmpeg, así que las portadas automáticas de los videos no se generan; verás placeholder o tendrás que subir tú las imágenes `.jpg` a Hetzner. El resto (lista, descarga, ZIP) sí funciona.

## Opción B – Railway

1. Entra a **https://railway.app** e inicia sesión.
2. **New Project** → **Deploy from GitHub** (conecta tu repo).
3. En **Variables** añade las mismas variables que en `.env.local`.  
   **NEXT_PUBLIC_APP_URL** = la URL que te asigne Railway (ej. `https://tu-app.up.railway.app`).
4. Si quieres portadas y metadatos automáticos, usa un **Dockerfile** que instale ffmpeg (en el proyecto hay un ejemplo en **DESPLIEGUE_SERVIDOR.md**).

## Opción C – Un VPS (Hetzner Cloud, etc.)

Si quieres control total y ffmpeg (portadas y metadatos automáticos):

1. Contratas un VPS (ej. en **https://www.hetzner.com/cloud**).
2. Instalas Node.js, ffmpeg y nginx (o Caddy).
3. Subes el proyecto (por Git o copiando archivos), ejecutas `npm install --legacy-peer-deps`, `npm run build`, `npm start` (o con PM2).
4. Configuras las variables de entorno en el servidor (las mismas que en `.env.local`, pero con **NEXT_PUBLIC_APP_URL** = tu dominio o IP).
5. Configuras nginx como proxy y HTTPS (Let’s Encrypt).

Los detalles están en **DESPLIEGUE_SERVIDOR.md**.

---

# PARTE 7 – Variables que debes tener en producción

En Vercel, Railway o en el VPS, configura **al menos** estas variables (con los valores reales de producción):

| Variable | Ejemplo / qué poner |
|----------|----------------------|
| `HETZNER_STORAGEBOX_HOST` | `u540473.your-storagebox.de` |
| `HETZNER_STORAGEBOX_USER` | Tu usuario Hetzner |
| `HETZNER_STORAGEBOX_PASSWORD` | Tu contraseña Hetzner |
| `NEXT_PUBLIC_APP_URL` | `https://tu-dominio.vercel.app` o tu dominio final |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key de Supabase |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client ID de PayPal (Live en producción) |
| `PAYPAL_CLIENT_SECRET` | Secret de PayPal (Live en producción) |

Opcional (para muchas descargas):

| Variable | Uso |
|----------|-----|
| `BUNNY_CDN_URL` | URL del Pull Zone de Bunny |
| `BUNNY_TOKEN_KEY` | Clave de Token Auth (Advanced) en Bunny |
| `BUNNY_STORAGE_ZONE` | Nombre de la Storage Zone en Bunny |
| `BUNNY_STORAGE_PASSWORD` | Password de la Storage Zone |

---

# PARTE 8 – Dominio propio (opcional)

1. Compra un dominio (ej. en Namecheap, GoDaddy, Google Domains, etc.).
2. En tu proveedor de dominio, crea un registro **CNAME** (o **A**) que apunte a la URL que te dio Vercel/Railway (en la ayuda de cada uno dicen exactamente qué poner).
3. En Vercel/Railway, en la configuración del proyecto, añade tu dominio. Ellos te dirán qué valor usar en el CNAME.
4. Cambia **NEXT_PUBLIC_APP_URL** a `https://tudominio.com` y vuelve a desplegar si hace falta.

---

# Resumen rápido (orden)

1. Instalar Node → abrir proyecto → `npm install --legacy-peer-deps`
2. Copiar `.env.example` a `.env.local`
3. Hetzner: tener Storage Box, subir videos por FTP, poner host/user/password en `.env.local`
4. Supabase: crear proyecto, ejecutar SQL de tablas, poner URL y keys en `.env.local`
5. PayPal: crear app (Sandbox o Live), poner Client ID y Secret en `.env.local`
6. `npm run dev` y abrir http://localhost:3000 para probar
7. Subir a Vercel (o Railway/VPS), añadir allí las mismas variables con **NEXT_PUBLIC_APP_URL** = URL de producción
8. (Opcional) Bunny para más descargas; (opcional) dominio propio

Si en algún paso te atoras, anota el número del paso y el mensaje de error que te salga y búscalos o pide ayuda con eso.
