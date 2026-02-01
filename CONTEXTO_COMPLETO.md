# 🐻 BEAR BEAT - Contexto Completo del Proyecto

> **IMPORTANTE**: Este archivo contiene TODO el contexto del proyecto.
> Si empiezas una nueva sesión de desarrollo, lee este archivo primero.

---

## 📋 Resumen Ejecutivo

**Bear Beat** es una plataforma de venta de video remixes para DJs.

### Modelo de Negocio
- **Producto**: Packs mensuales de video remixes (3,000+ videos HD/4K)
- **Precio**: $350 MXN por pack (pago único, acceso permanente)
- **Usuarios**: DJs profesionales en México y LATAM

### Stack Tecnológico
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Pagos**: Stripe (tarjeta, OXXO, SPEI)
- **Tracking**: ManyChat + Meta Pixel + CAPI + Supabase
- **Chatbot**: Sistema propio con detección de intenciones

---

## 🗂️ Estructura del Proyecto

```
BEAR BEAT 2027 3.0/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page principal
│   │   ├── layout.tsx            # Layout global (analytics, chat)
│   │   ├── checkout/             # Proceso de pago
│   │   ├── complete-purchase/    # Post-pago (registro)
│   │   ├── dashboard/            # Dashboard del usuario
│   │   ├── login/                # Login
│   │   ├── register/             # Registro
│   │   ├── admin/                # Panel de administración
│   │   │   ├── page.tsx          # Dashboard admin
│   │   │   ├── users/            # Gestión de usuarios
│   │   │   ├── purchases/        # Gestión de compras
│   │   │   ├── packs/            # Gestión de packs
│   │   │   ├── tracking/         # Analytics de tracking
│   │   │   ├── attribution/      # Atribución de tráfico
│   │   │   ├── chatbot/          # Centro del chatbot
│   │   │   ├── manychat/         # Config ManyChat
│   │   │   └── pending/          # Pagos pendientes
│   │   └── api/
│   │       ├── create-checkout/  # Crear sesión Stripe
│   │       ├── webhooks/stripe/  # Webhook de Stripe
│   │       ├── track-event/      # Guardar eventos
│   │       ├── chat/             # API chat web
│   │       ├── facebook/         # CAPI Facebook
│   │       └── manychat/         # API ManyChat
│   │           ├── route.ts      # Acciones ManyChat
│   │           ├── init/         # Inicializar tags
│   │           └── webhook/      # Webhook chatbot
│   ├── components/
│   │   ├── ui/                   # Componentes UI (shadcn)
│   │   ├── chat/                 # Widget de chat web
│   │   ├── tracking/             # Componentes tracking
│   │   ├── analytics/            # Meta Pixel
│   │   └── manychat/             # ManyChat widget
│   └── lib/
│       ├── supabase/             # Cliente Supabase
│       ├── tracking.ts           # Sistema de tracking
│       ├── attribution.ts        # Atribución de tráfico
│       ├── chatbot.ts            # Motor del chatbot
│       ├── manychat.ts           # API ManyChat
│       └── facebook-capi.ts      # Facebook CAPI
├── supabase/
│   ├── schema.sql                # Schema principal
│   ├── schema_tracking.sql       # Tablas de tracking
│   ├── schema_attribution.sql    # Tablas de atribución
│   └── schema_chatbot.sql        # Tablas del chatbot
├── public/
│   └── brand/                    # Logos y assets
└── *.md                          # Documentación
```

---

## 🔐 Variables de Entorno (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mthumshmwzmkwjulpbql.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (configurar en producción)

# ManyChat
NEXT_PUBLIC_MANYCHAT_PAGE_ID=104901938679498
MANYCHAT_API_KEY=104901938679498:ccb70598a0c14bcf3988c5a8d117cc63

# Facebook
NEXT_PUBLIC_META_PIXEL_ID=1325763147585869
FACEBOOK_CAPI_ACCESS_TOKEN=EAALspql1C78BQ...

# Twilio (pendiente configurar)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## 💳 Flujo de Compra (Sin Fricción)

```
1. Usuario llega a landing
         ↓
2. Click en "COMPRAR AHORA"
         ↓
3. Selecciona método de pago (OXXO/SPEI/Tarjeta)
         ↓
4. Stripe Checkout (SIN registro previo)
         ↓
5. Pago exitoso → Webhook guarda en pending_purchases
         ↓
6. Redirect a /complete-purchase
         ↓
7. Usuario ingresa email
         ↓
8. Si existe → Login
   Si no existe → Crear cuenta
         ↓
9. Se activa el acceso al pack
         ↓
10. Redirect a /dashboard
```

**Clave**: El pago se asegura ANTES de pedir datos del usuario.

---

## 📊 Sistema de Tracking

### Plataformas Integradas

1. **Supabase** (user_events) - Base de datos interna
2. **ManyChat** - Marketing automation
3. **Meta Pixel** - Analytics Facebook (cliente)
4. **Facebook CAPI** - Analytics Facebook (servidor)

### Eventos Trackeados

| Evento | Supabase | ManyChat | Facebook |
|--------|----------|----------|----------|
| PageView | ✅ | ✅ | ✅ |
| CTA Click | ✅ | ✅ | ✅ |
| Start Checkout | ✅ | ✅ | ✅ (InitiateCheckout) |
| Payment Success | ✅ | ✅ | ✅ (Purchase) |
| Registration | ✅ | ✅ | ✅ (CompleteRegistration) |
| Login | ✅ | ✅ | ✅ |
| Download | ✅ | ✅ | ✅ |

### Deduplicación Facebook

- Se genera un `event_id` único
- Se envía al Pixel (cliente) y CAPI (servidor) con el mismo ID
- Facebook deduplica automáticamente

---

## 🎯 Sistema de Atribución

### Datos Capturados

- **UTM Parameters**: source, medium, campaign, content, term
- **Click IDs**: fbclid, gclid, ttclid
- **Referrer**: De dónde viene el usuario
- **Device**: Tipo, browser, OS

### Fuentes Detectadas

- Facebook (orgánico y ads)
- Instagram
- TikTok
- Google (orgánico y ads)
- WhatsApp
- Telegram
- YouTube
- Twitter/X
- Directo

### Almacenamiento

- **localStorage**: first_visit, last_visit
- **Supabase**: user_events con atribución
- **ManyChat**: Custom fields de UTM

---

## 🤖 Sistema de Chatbot

### Intenciones

| Intent | Keywords | Acción |
|--------|----------|--------|
| password_reset | contraseña, olvidé | Envía link reset |
| payment_no_access | pagué, no acceso | Verifica DB |
| download_issue | descarga, ftp | Guía de ayuda |
| price_question | precio, cuánto | Info precio |
| payment_methods | oxxo, spei | Métodos disponibles |
| complaint | queja, estafa | Escala a humano |
| human_request | agente, persona | Escala a humano |

### Canales

1. **ManyChat** (WhatsApp/Messenger) - via webhook
2. **Chat Web** - Widget en la página

### Base de Datos

- `conversations` - Una por usuario
- `messages` - Todos los mensajes
- `intents` - Configuración de intenciones
- `knowledge_base` - FAQs

---

## 🗄️ Base de Datos (Supabase)

### Tablas Principales

```sql
users              # Usuarios registrados
packs              # Packs de videos
purchases          # Compras completadas
pending_purchases  # Pagos pendientes de registro
genres             # Géneros musicales
videos             # Videos del catálogo
```

### Tablas de Tracking

```sql
user_events        # Todos los eventos del usuario
```

### Tablas de Chatbot

```sql
conversations      # Conversaciones
messages           # Mensajes individuales
intents            # Intenciones configuradas
knowledge_base     # FAQs
bot_actions        # Acciones ejecutadas
```

---

## 🔧 Comandos Útiles

```bash
# Desarrollo
cd "/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0"
npm install
npm run dev

# Si el puerto 3000 está ocupado
PORT=3001 npm run dev

# Si hay error de network interfaces (Node v25)
# Ya está mitigado con output: 'standalone' en next.config.mjs
```

---

## 📝 Archivos de Documentación

| Archivo | Contenido |
|---------|-----------|
| CONTEXTO_COMPLETO.md | **ESTE ARCHIVO** - Todo el contexto |
| GUIA_DE_MARCA.md | Colores, logos, tipografía |
| SISTEMA_AUTH_ADMIN.md | Sistema de autenticación |
| FLUJO_SIN_FRICCION.md | Checkout sin registro |
| METODOS_DE_PAGO.md | Stripe, OXXO, SPEI |
| INTEGRACION_MANYCHAT.md | ManyChat API |
| INTEGRACION_META_PIXEL.md | Facebook Pixel + CAPI |
| SISTEMA_ATRIBUCION.md | Tracking de tráfico |
| SISTEMA_CHATBOT.md | Bot inteligente |

---

## ⚠️ Pendientes por Implementar

1. **PayPal** - Integración de pagos
2. **Cloudflare R2** - Storage de 30TB+
3. **FTP Server** - Descargas masivas
4. **Resend** - Emails transaccionales
5. **Twilio** - SMS/WhatsApp notificaciones
6. **Onboarding Tour** - Guía post-compra

---

## 🐛 Problemas Conocidos y Soluciones

### Error: Puerto 3000 ocupado
```bash
lsof -ti:3000 | xargs kill -9
# o usar otro puerto
PORT=3001 npm run dev
```

### Error: Network interfaces (Node v25)
Ya resuelto con `output: 'standalone'` en `next.config.mjs`

### Error: React 19 con Stripe
Usando React 18.3.1 (downgrade en package.json)

---

## 🎨 Marca Bear Beat

### Colores
- **Azul Principal**: #0066FF (bear-blue)
- **Negro**: #000000
- **Blanco**: #FFFFFF
- **Gradientes**: Azul a negro

### Logo
- Ubicación: `/public/brand/`
- Usar versión horizontal para header
- Usar solo ícono para favicon y mobile

---

## 💡 Notas Importantes

1. **Siempre usar Server Components** cuando sea posible
2. **Tracking en cada acción** - Supabase + ManyChat + Facebook
3. **Deduplicar Facebook** - Usar event_id compartido
4. **Chatbot primero** - Escalar a humano solo si es necesario
5. **Mobile first** - La mayoría viene de móvil
6. **Claridad extrema** - "Que lo entienda un niño de 5 años"

---

## 📞 Soporte al Desarrollador

Si tienes dudas sobre:
- **Tracking**: Ver `/src/lib/tracking.ts`
- **ManyChat**: Ver `/src/lib/manychat.ts`
- **Facebook**: Ver `/src/lib/facebook-capi.ts`
- **Chatbot**: Ver `/src/lib/chatbot.ts`
- **Atribución**: Ver `/src/lib/attribution.ts`

---

*Última actualización: Enero 2026*
*Versión del proyecto: 3.0*
