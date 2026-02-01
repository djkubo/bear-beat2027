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
- **Deploy**: Vercel

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

Ver `supabase/schema.sql` para el esquema completo.

Tablas principales:
- `users` - Usuarios
- `packs` - Packs mensuales
- `purchases` - Compras
- `videos` - Videos en cada pack
- `genres` - Géneros musicales

## 🚀 Deploy

```bash
# Deploy a Vercel
vercel --prod

# O push a main con auto-deploy configurado
git push origin main
```

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
