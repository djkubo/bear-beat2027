# Render – Lo que tú haces (yo ya dejé el proyecto listo)

El proyecto ya está preparado para Render. **Tú solo haces esto:**

---

## 1. Subir el código a GitHub (si no está ya)

- Si ya tienes el repo en GitHub, ignora este paso.
- Si no: crea un repo en GitHub, sube la carpeta del proyecto (incluyendo `render.yaml` y `Dockerfile`).

---

## 2. Conectar Render con tu repo

1. Entra a **https://dashboard.render.com** e inicia sesión.
2. Clic en **New +** → **Web Service**.
3. Conecta tu cuenta de **GitHub** si no lo has hecho y elige el repositorio de Bear Beat.
4. Render puede detectar `render.yaml` y proponer el servicio. Si no:
   - **Name:** `bear-beat` (o el que quieras).
   - **Region:** el más cercano a tu audiencia.
   - **Branch:** `main` (o la rama que uses).
   - **Runtime:** **Node** (o **Docker** si quieres ffmpeg, ver abajo).

---

## 3. Comandos de build y start

Si **no** usas el archivo `render.yaml` y configuras a mano:

| Campo | Valor |
|-------|--------|
| **Build Command** | `npm install --legacy-peer-deps && npm run build` |
| **Start Command** | `npm start` |

Si usas **Docker** (para tener ffmpeg y portadas automáticas):

| Campo | Valor |
|-------|--------|
| **Runtime** | **Docker** |
| (Render usará el **Dockerfile** del repo; no pongas Build/Start a mano) |

---

## 4. Variables de entorno (lo único que “necesito” de ti)

En Render: tu servicio → **Environment** → **Add Environment Variable**.

Añade **cada** variable que tengas en tu `.env.local` (mismo nombre, mismo valor). Como mínimo estas:

| Variable | Dónde la tienes |
|----------|------------------|
| `HETZNER_STORAGEBOX_HOST` | Tu .env.local |
| `HETZNER_STORAGEBOX_USER` | Tu .env.local |
| `HETZNER_STORAGEBOX_PASSWORD` | Tu .env.local |
| `NEXT_PUBLIC_APP_URL` | **Aquí pon la URL de Render** (ej. `https://bear-beat.onrender.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Tu .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu .env.local |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Tu .env.local (Live en producción) |
| `PAYPAL_CLIENT_SECRET` | Tu .env.local (Live en producción) |

Opcional (Bunny para muchas descargas):

| Variable | Dónde la tienes |
|----------|------------------|
| `BUNNY_CDN_URL` | Tu .env.local |
| `BUNNY_TOKEN_KEY` | Tu .env.local |
| `BUNNY_STORAGE_ZONE` | Tu .env.local |
| `BUNNY_STORAGE_PASSWORD` | Tu .env.local |

Opcional (FTP automático por compra):

| Variable | Dónde la tienes |
|----------|------------------|
| `HETZNER_STORAGEBOX_ID` | Tu .env.local |
| `HETZNER_ROBOT_USER` | Tu .env.local |
| `HETZNER_ROBOT_PASSWORD` | Tu .env.local |

**Importante:**  
- `NEXT_PUBLIC_APP_URL` en Render debe ser la URL que te asigne Render (ej. `https://bear-beat-xxx.onrender.com`). Puedes ponerla después del primer deploy y volver a desplegar.

---

## 5. Desplegar

1. Clic en **Create Web Service** (o **Save** si ya existía).
2. Render hará el build y luego levantará la app. El primer deploy puede tardar unos minutos.
3. Cuando termine, te dará una URL tipo `https://bear-beat-xxx.onrender.com`. Entra y prueba.
4. En **Environment** pon `NEXT_PUBLIC_APP_URL=https://bear-beat-xxx.onrender.com` (tu URL real) y haz **Manual Deploy** si hace falta.

---

## Resumen – Qué necesito de ti

- **Nada que “darme” a mí.**  
- Solo que **en Render**:
  1. Conectes el repo.
  2. Uses los comandos de build/start (o Docker con el Dockerfile).
  3. Añadas las variables de entorno **copiando los valores de tu `.env.local`** (y `NEXT_PUBLIC_APP_URL` con la URL de Render).

El código y la configuración para Render (incluido el Dockerfile con ffmpeg) ya están en el proyecto; tú solo configuras el servicio y las variables en el dashboard de Render.
