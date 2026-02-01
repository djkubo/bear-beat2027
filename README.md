# 🐻 BEAR BEAT - Video Remixes DJ 2026

Plataforma de distribución de video remixes para DJs con modelo de packs mensuales.

![Bear Beat Logo](public/logos/BBLOGOTIPOPOSITIVO_Mesa%20de%20trabajo%201.png)

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS 3.4
- **Base de Datos**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2
- **Pagos**: Stripe + PayPal + Conekta (México)
- **Emails**: Resend
- **Deploy**: Render

## 🐻 Marca: Bear Beat

**Valores**: Liderazgo • Confianza • Exclusividad • Tecnología • Vanguardismo

**Colores oficiales**:
- Azul Bear Beat: `#08E1F7` - Tecnología y creatividad
- Negro: `#000000` - Poder y sofisticación

**Concepto**: El oso representa fuerza y liderazgo. El diapasón en la nariz simboliza el ritmo/beat musical.

## 📦 Modelo de Negocio

- **Packs mensuales** a $350 MXN cada uno
- Usuario compra solo los packs que quiera
- Acceso permanente a packs comprados
- Ofertas de bundles (3 packs x $900)

## 🛠️ Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 3. Ejecutar en desarrollo
npm run dev

# 4. Abrir navegador
open http://localhost:3000
```

## 📁 Estructura del Proyecto

```
├── src/
│   ├── app/              # App Router (Next.js 15)
│   │   ├── (marketing)/  # Landing page pública
│   │   ├── (dashboard)/  # Área de cliente
│   │   ├── admin/        # Panel administrativo
│   │   └── api/          # API Routes
│   ├── components/       # Componentes reutilizables
│   ├── lib/              # Utilidades y configuración
│   └── types/            # TypeScript types
├── public/               # Assets estáticos
└── supabase/            # Migraciones y seeds
```

## 🗄️ Base de Datos

Ejecuta **todo** el archivo `supabase/SETUP_COMPLETO.sql` en el SQL Editor de Supabase. Crea todas las tablas, RLS y datos iniciales (géneros, pack Enero 2026).

Tablas principales: `users`, `packs`, `genres`, `videos`, `purchases`, `pending_purchases`, `user_events`, `push_subscriptions`, `push_notifications_history`, `ftp_pool`, `conversations`, `messages`.

## 📋 Producción (todo en un solo doc)

**Ver [PRODUCCION.md](PRODUCCION.md)** para: lista de todas las páginas y APIs, variables de entorno, base de datos, checklist y scripts (`db:setup`, `db:sync-videos`, `deploy:env`).

## 🚀 Deploy

Hosting en **Render**. Conecta tu repo en [render.com](https://render.com):

1. New → Web Service → Conecta tu repositorio
2. Build command: `npm install && npm run build`
3. Start command: `npm run start`
4. Configura las variables de entorno desde `.env.local`
5. Push a `main` para auto-deploy

## 👤 Admin y Dashboard

- **Panel de admin** (`/admin`): usuarios, compras, packs, pendientes, tracking, chatbot, push. Solo usuarios con `role = 'admin'` en la tabla `users`. Crear admin: `UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';`
- **Dashboard cliente** (`/dashboard`): usuario logueado ve sus packs y credenciales FTP.
- **Listado de videos en producción:** en Render no hay carpeta local; el listado se sirve desde Supabase. Poblar catálogo: `npm run db:sync-videos` (una vez, desde tu máquina con la carpeta de videos). Ver `RENDER_DEPLOY.md` y `INSTALACION.md`.

## 📝 Variables de Entorno Requeridas

Ver `.env.example` para la lista completa.

Mínimas para desarrollo:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`

## 📄 Licencia

Propietario - Todos los derechos reservados

## 👨‍💻 Soporte

- Email: support@videoremixesdj.com
- WhatsApp: +52 123 456 7890
