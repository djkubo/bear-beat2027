# 📦 Configuración de Storage para Bear Beat

## ⚠️ IMPORTANTE: Google Drive NO protege nada

Los links de Drive se pueden compartir y no hay forma de evitar descargas.
Para demos protegidos necesitas **streaming con URLs firmadas**.

---

## 🎯 Opción Recomendada: BUNNY.NET

### ¿Por qué Bunny.net?

| Característica | Bunny.net | Google Drive |
|----------------|-----------|--------------|
| URLs firmadas | ✅ Sí | ❌ No |
| Expiran automáticamente | ✅ Sí | ❌ No |
| Bloqueo por dominio | ✅ Sí | ❌ No |
| Streaming protegido | ✅ Sí | ❌ No |
| Precio | $0.01/GB | "Gratis"* |

*Google Drive tiene límites y se roban el contenido

### Precio de Bunny.net

```
Storage: $0.01/GB/mes
Transferencia: $0.01/GB
Streaming: $1/1000 minutos

Ejemplo 1TB con 500 descargas de 500MB:
- Storage: 1000 GB × $0.01 = $10/mes
- Transfer: 250 GB × $0.01 = $2.50/mes
- Total: ~$12.50 USD/mes
```

### Configuración Paso a Paso

#### 1. Crear cuenta
1. Ir a https://bunny.net
2. Registrarse (tiene prueba gratis)
3. Agregar método de pago

#### 2. Crear Storage Zone (para archivos)
1. Dashboard → Storage → Add Storage Zone
2. Nombre: `bear-beat`
3. Región: Los Angeles (más cerca de México)
4. Copiar las credenciales

#### 3. Crear Pull Zone (CDN)
1. Dashboard → CDN → Add Pull Zone
2. Nombre: `bear-beat-cdn`
3. Origin: Tu Storage Zone
4. Habilitar "Token Authentication"
5. Copiar la URL del CDN

#### 4. Crear Stream Library (para demos)
1. Dashboard → Stream → Create Library
2. Nombre: `bear-beat-demos`
3. Habilitar "Token Authentication"
4. Copiar Library ID y API Key

#### 5. Configurar en .env.local

```env
BUNNY_API_KEY=tu_api_key_del_dashboard
BUNNY_STORAGE_ZONE=bear-beat
BUNNY_STORAGE_PASSWORD=password_de_storage_zone
BUNNY_CDN_URL=https://bear-beat.b-cdn.net
BUNNY_TOKEN_KEY=genera_una_clave_secreta_aqui
BUNNY_STREAM_LIBRARY_ID=12345
BUNNY_STREAM_API_KEY=stream_api_key
```

---

## 🔒 Cómo funciona la protección

### Para Demos (Streaming):
1. Usuario da clic en "Ver demo"
2. Backend genera URL firmada (expira en 30 min)
3. Video se reproduce via iframe de Bunny Stream
4. No hay URL directa al archivo
5. Click derecho bloqueado
6. Watermark "BEAR BEAT DEMO"

### Para Descargas (Usuarios con acceso):
1. Usuario compra el pack
2. Backend verifica la compra
3. Genera URL firmada (expira en 1 hora)
4. Solo funciona desde bearbeat.mx
5. Se registra la descarga

---

## 🎬 Tu Estructura Real (Videos Enero 2026)

Tu carpeta actual tiene esta estructura perfecta:

```
Videos Enero 2026/
├── Bachata/     (12 videos) 💃
├── Cubaton/     (37 videos) 🇨🇺
├── Cumbia/      (31 videos) 🎺
├── Dembow/      (7 videos)  🔥
├── Merengue/    (37 videos) 🎹
├── Reggaeton/   (22 videos) 🎤
└── Salsa/       (18 videos) 💫
= 157 videos totales
```

Formato de archivos: `Artista - Canción (Key – BPM).mp4`
Ejemplo: `Bad Bunny - Monaco (10A – 124 BPM).mp4`

El sistema ya lee automáticamente:
- Nombre del artista
- Título de la canción
- Key musical (para mezclar)
- BPM (para sincronizar)

---

## 📁 Estructura de Carpetas en Bunny

```
bear-beat/                    # Storage Zone
├── packs/
│   ├── enero-2026/
│   │   ├── reggaeton/
│   │   │   ├── bad-bunny-monaco.mp4
│   │   │   └── karol-g-tqg.mp4
│   │   ├── pop/
│   │   ├── rock/
│   │   └── cumbia/
│   └── febrero-2026/
├── thumbnails/
│   ├── bad-bunny-monaco.jpg
│   └── ...
└── assets/
    └── logos/

bear-beat-demos/              # Stream Library (videos de demo)
├── demo-reggaeton-1.mp4      → Se convierte a streaming HLS
├── demo-pop-1.mp4
└── ...
```

---

## 📤 Subir Archivos

### Opción A: Panel de Bunny (manual)
1. Dashboard → Storage → bear-beat
2. Navegar a la carpeta
3. Drag & drop archivos

### Opción B: FTP (masivo)
```
Host: storage.bunnycdn.com
Usuario: bear-beat
Password: tu_storage_password
Puerto: 21 (FTP) o 22 (SFTP)
```

### Opción C: API (programático)
```bash
curl -X PUT \
  "https://storage.bunnycdn.com/bear-beat/packs/enero-2026/reggaeton/video.mp4" \
  -H "AccessKey: TU_PASSWORD" \
  -H "Content-Type: video/mp4" \
  --data-binary @video.mp4
```

---

## 🚀 Pasos para empezar HOY

1. **Crear cuenta en Bunny.net** (5 min)
2. **Crear Storage Zone** `bear-beat` (2 min)
3. **Crear Pull Zone** con Token Auth (2 min)
4. **Copiar credenciales a .env.local** (1 min)
5. **Subir algunos videos de prueba** (10 min)
6. **Probar la página /preview** (2 min)

Total: ~22 minutos

---

## 💰 Otras Opciones de Storage

### Opción 2: Cloudflare R2 (RECOMENDADO para 30TB+)

**Precio**: $0.015/GB/mes + SIN cobro por descargas
**Ideal para**: 30TB+ de contenido

```
Costo estimado para 30TB:
- Storage: 30,000 GB × $0.015 = $450 USD/mes
- Descargas: $0 (sin egress fees)
- Total: ~$450 USD/mes
```

**Configuración:**

1. Crear cuenta en cloudflare.com
2. Ir a R2 → Create Bucket
3. Nombre: `bear-beat-videos`
4. Crear API Token con permisos de R2

```env
# Agregar a .env.local
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key
R2_SECRET_ACCESS_KEY=tu_secret_key
R2_BUCKET_NAME=bear-beat-videos
R2_PUBLIC_URL=https://bear-beat-videos.tu-dominio.com
```

---

### Opción 2: Backblaze B2

**Precio**: $0.006/GB/mes + $0.01/GB descarga
**Ideal para**: Presupuesto bajo

```
Costo estimado para 30TB (500 descargas/mes de 50GB):
- Storage: 30,000 GB × $0.006 = $180 USD/mes
- Descargas: 25,000 GB × $0.01 = $250 USD/mes
- Total: ~$430 USD/mes
```

---

### Opción 3: Google Drive (PARA EMPEZAR)

**Precio**: $10-20 USD/mes (Google Workspace)
**Límite**: 2TB-5TB
**Ideal para**: Validar el producto rápido

**Ventajas:**
- Ya tienes cuenta
- Fácil de usar
- Links directos funcionan

**Desventajas:**
- Límite de storage
- Límite de descargas diarias
- No es profesional a largo plazo

---

### Opción 4: VPS con FTP (Budget Option)

**Precio**: $20-50 USD/mes (Hetzner, Contabo)
**Storage**: 1-4TB incluido
**Ideal para**: Control total, FTP nativo

Servidores recomendados:
- **Hetzner Storage Box**: €3.5/mes por 1TB
- **Contabo VPS**: $8.99/mes con 400GB SSD
- **OVH**: €5/mes por 500GB

---

## 🗂️ Estructura de Carpetas

```
/videos
├── /packs
│   ├── /enero-2026
│   │   ├── /reggaeton
│   │   │   ├── bad-bunny-monaco.mp4
│   │   │   ├── karol-g-tqg.mp4
│   │   │   └── ...
│   │   ├── /pop
│   │   ├── /rock
│   │   ├── /cumbia
│   │   ├── /electronica
│   │   └── /clasicos
│   ├── /febrero-2026
│   └── /marzo-2026
├── /demos (videos de preview, baja calidad)
│   ├── preview1.mp4 (30 seg, 480p, watermark)
│   └── ...
└── /thumbnails
    ├── thumb1.jpg
    └── ...
```

---

## 🔒 Protección de Archivos

### URLs Firmadas (Signed URLs)

Para que solo usuarios con acceso puedan descargar:

```typescript
// Generar URL firmada (expira en 1 hora)
const signedUrl = await generateSignedUrl({
  bucket: 'bear-beat-videos',
  key: 'packs/enero-2026/reggaeton/bad-bunny.mp4',
  expiresIn: 3600, // 1 hora
  userId: 'user_123' // para tracking
})
```

### Verificación de Acceso

Antes de generar URL:
1. Verificar usuario autenticado
2. Verificar que compró el pack
3. Generar URL firmada
4. Registrar descarga en DB

---

## 🚀 Configuración Rápida con Google Drive

Para empezar HOY mientras configuras R2:

### Paso 1: Crear carpeta en Drive

```
Bear Beat Videos/
├── Enero 2026/
│   ├── Reggaeton/
│   ├── Pop/
│   └── ...
└── Demos/ (públicos)
```

### Paso 2: Obtener IDs de carpeta

1. Abre la carpeta en Drive
2. Copia el ID de la URL: `drive.google.com/drive/folders/ESTE_ES_EL_ID`

### Paso 3: Compartir carpetas

- Demos: Público (cualquiera con el link)
- Packs: Restringido (solo con el link + verificación)

### Paso 4: Agregar variables

```env
GOOGLE_DRIVE_DEMOS_FOLDER_ID=1abc123...
GOOGLE_DRIVE_PACK_ENERO_FOLDER_ID=1xyz789...
```

---

## 📡 Configuración FTP

### Pure-FTPd (Recomendado)

```bash
# En tu VPS (Ubuntu/Debian)
apt update
apt install pure-ftpd

# Crear usuario para cada cliente
pure-pw useradd dj_user123 -u ftpuser -d /home/ftpusers/user123
pure-pw mkdb

# Configurar TLS
# /etc/pure-ftpd/conf/TLS = 2
```

### Estructura para FTP

```
/home/ftpusers/
├── /user_abc123/           # Directorio del usuario
│   └── /pack-enero-2026/   # Solo los packs que compró
│       ├── /reggaeton/
│       └── ...
└── /user_xyz789/
    └── /pack-enero-2026/
```

### Credenciales FTP

Al completar compra, generar automáticamente:
- Username: `dj_` + primeros 8 chars del user_id
- Password: Generada aleatoriamente
- Enviar por email y WhatsApp

---

## 🔗 Integración con Bear Beat

### API de archivos

```typescript
// src/lib/storage.ts

export async function listPackFiles(packId: string, userId: string) {
  // Verificar que usuario compró el pack
  const hasPurchase = await verifyPurchase(userId, packId)
  if (!hasPurchase) throw new Error('No tienes acceso a este pack')
  
  // Listar archivos del pack
  const files = await listR2Files(`packs/${packId}`)
  
  return files
}

export async function getDownloadUrl(fileKey: string, userId: string) {
  // Verificar acceso
  const packId = extractPackId(fileKey)
  const hasPurchase = await verifyPurchase(userId, packId)
  if (!hasPurchase) throw new Error('No tienes acceso')
  
  // Generar URL firmada
  const url = await generateSignedUrl(fileKey, 3600)
  
  // Registrar descarga
  await logDownload(userId, fileKey)
  
  return url
}
```

---

## 💰 Comparativa de Costos

| Servicio | 10TB | 30TB | 100TB |
|----------|------|------|-------|
| Cloudflare R2 | $150/mes | $450/mes | $1,500/mes |
| Backblaze B2 | $60/mes* | $180/mes* | $600/mes* |
| AWS S3 | $230/mes | $690/mes | $2,300/mes |
| Google Cloud | $200/mes | $600/mes | $2,000/mes |
| VPS (Hetzner) | $50/mes | $150/mes | $500/mes |

*Sin contar egress (descargas)

---

## 🎯 Recomendación Final

### Para empezar AHORA:
1. **Google Drive** para los demos (gratis)
2. **Links directos** temporales para compradores

### Para escalar (1-2 semanas):
1. Configurar **Cloudflare R2**
2. Migrar archivos
3. Implementar URLs firmadas

### Para FTP (opcional):
1. VPS en Hetzner ($20/mes)
2. Pure-FTPd configurado
3. Usuarios automáticos al comprar

---

¿Necesitas ayuda configurando alguna opción? 🚀
