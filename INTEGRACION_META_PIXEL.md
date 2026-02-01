# 📊 Integración Meta Pixel + Conversions API (CAPI) - Bear Beat

## ✅ Configuración Completa NIVEL DIOS

El Meta Pixel + Conversions API están instalados con:
- **Tracking redundante** (cliente + servidor)
- **Deduplicación perfecta** usando `event_id`
- **Sincronización total** con Supabase, ManyChat y Facebook
- **Funciona aunque el usuario tenga bloqueadores**

### Variables de Entorno

```env
# Pixel (cliente)
NEXT_PUBLIC_META_PIXEL_ID=1325763147585869

# Conversions API (servidor)
FACEBOOK_CAPI_ACCESS_TOKEN=EAALspql1C78BO...
```

### Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| `src/components/analytics/MetaPixel.tsx` | Componente del pixel + funciones con deduplicación |
| `src/lib/facebook-capi.ts` | Servicio completo para Conversions API (servidor) |
| `src/app/api/facebook/route.ts` | API Route para enviar eventos a CAPI |
| `src/components/analytics/index.ts` | Exports para fácil importación |
| `src/lib/tracking.ts` | Sistema unificado: Supabase + ManyChat + Pixel + CAPI |
| `src/app/layout.tsx` | Incluye el Meta Pixel en toda la app |

---

## 🔄 Cómo Funciona la Deduplicación

Facebook puede recibir el mismo evento desde 2 fuentes:
1. **Meta Pixel** (navegador/cliente)
2. **Conversions API** (servidor)

Para evitar contar 2 veces, usamos **event_id**:

```
Usuario hace compra
       ↓
┌──────────────────────────────────────┐
│  Generar event_id único              │
│  event_id = "bb_1706644800_abc123"   │
└──────────────────────────────────────┘
       ↓                    ↓
   PIXEL (cliente)      CAPI (servidor)
   eventID: "bb_..."    event_id: "bb_..."
       ↓                    ↓
       └────────┬───────────┘
                ↓
        Facebook recibe ambos
        con el mismo event_id
                ↓
        DEDUPLICA → cuenta 1 solo evento
```

### Reglas de Deduplicación de Facebook:
- Eventos con **mismo event_id + event_name** se deduplican
- Ventana de tiempo: **48 horas**
- Si ambos llegan en **5 minutos**, Facebook prefiere el del Pixel

---

## 🎯 Eventos que se Trackean

### Eventos Estándar de Facebook (Optimizados para Ads)

| Evento | Cuándo se dispara | Importancia |
|--------|-------------------|-------------|
| `PageView` | Cada visita a página | ⭐⭐⭐ |
| `ViewContent` | Ver un pack o video | ⭐⭐⭐⭐ |
| `AddToCart` | Agregar pack al carrito | ⭐⭐⭐⭐ |
| `InitiateCheckout` | Iniciar proceso de pago | ⭐⭐⭐⭐⭐ |
| `AddPaymentInfo` | Seleccionar método de pago | ⭐⭐⭐⭐ |
| `Purchase` | Compra completada | ⭐⭐⭐⭐⭐ |
| `Lead` | Usuario da email/teléfono | ⭐⭐⭐⭐ |
| `CompleteRegistration` | Registro completado | ⭐⭐⭐⭐ |
| `Contact` | Contactar soporte | ⭐⭐⭐ |

### Eventos Personalizados (Custom Events)

| Evento | Cuándo se dispara |
|--------|-------------------|
| `CTAClick` | Click en cualquier botón de acción |
| `VideoPreview` | Ver preview de un video |
| `SelectPaymentMethod` | Seleccionar OXXO/SPEI/Tarjeta/PayPal |
| `StartDownload` | Iniciar descarga de pack |
| `CompleteDownload` | Completar descarga |
| `FAQView` | Abrir una pregunta frecuente |
| `ScrollToSection` | Scroll a una sección específica |
| `TimeOnPage` | Tiempo en una página (cada X segundos) |
| `CartAbandonment` | Abandonar carrito (crítico para retargeting) |
| `Login` | Iniciar sesión |
| `ViewPack` | Ver detalles de un pack |
| `Share` | Compartir en redes |

---

## 🔄 Flujo de Tracking Completo (4 Destinos)

Cada acción del usuario se envía simultáneamente a:

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO HACE ACCIÓN                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────┴────────────────────┐
         ↓                                          ↓
    CLIENTE (navegador)                      SERVIDOR (API Routes)
         ↓                                          ↓
    ┌─────────┐                           ┌──────────────────┐
    │ PIXEL   │                           │ SUPABASE         │
    │ Facebook│                           │ (user_events)    │
    └─────────┘                           └──────────────────┘
         ↓                                          ↓
    (eventID)                                 ┌─────────────┐
         ↓                                    │ MANYCHAT    │
    ┌─────────┐                               │ (tags/fields)│
    │ CAPI    │◄──────────────────────────────└─────────────┘
    │ Facebook│      (mismo event_id)
    │(servidor)│
    └─────────┘
```

### Ejemplo: Usuario Compra

```
Purchase ($350 MXN, Pack Enero 2026)
       ↓
1. PIXEL → fbq('track', 'Purchase', {...}, {eventID: 'bb_123'})
2. CAPI  → POST /api/facebook {event_id: 'bb_123', value: 350...}
3. SUPABASE → INSERT user_events {type: 'payment_success'...}
4. MANYCHAT → addTag('bb_customer'), setField('bb_total_spent', 350)
       ↓
Facebook deduplica Pixel + CAPI = 1 Purchase
Supabase guarda el evento para analytics interno
ManyChat actualiza al usuario para flujos automáticos
```

---

## 💻 Cómo Usar en Código

### Tracking Automático (Ya configurado)

```tsx
// En cualquier componente, importa desde tracking.ts
import { 
  trackPageView,
  trackCTAClick,
  trackViewPack,
  trackStartCheckout,
  trackPaymentSuccess,
  // ... etc
} from '@/lib/tracking'

// Los eventos van automáticamente a:
// 1. Supabase (user_events)
// 2. ManyChat (si hay email/phone)
// 3. Meta Pixel (Facebook)
```

### Ejemplo: Botón de Compra

```tsx
<Button 
  onClick={() => {
    trackCTAClick('Comprar Ahora', 'hero-section')
    trackAddToCart('pack-enero-2026', 'Pack Enero 2026', 350)
    router.push('/checkout?pack=pack-enero-2026')
  }}
>
  COMPRAR AHORA - $350 MXN
</Button>
```

### Ejemplo: Completar Compra

```tsx
// Después de un pago exitoso
trackPaymentSuccess(
  userId,
  packId,
  350,           // amount
  'Pack Enero 2026', // packName
  'MXN',         // currency
  email,
  phone
)
```

### Funciones de Facebook Pixel Directas

```tsx
import {
  fbTrackPurchase,
  fbTrackViewContent,
  fbTrackInitiateCheckout,
  // ... etc
} from '@/components/analytics/MetaPixel'

// Llamar directamente si necesitas control total
fbTrackPurchase({
  content_name: 'Pack Enero 2026',
  content_ids: ['pack-1'],
  value: 350,
  currency: 'MXN',
})
```

---

## 📈 Configuración de Conversiones en Facebook Ads

### Paso 1: Verificar el Pixel

1. Instala la extensión [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. Visita tu sitio
3. Verifica que el ícono muestra ✅ verde

### Paso 2: Crear Conversiones Personalizadas

En el **Administrador de Eventos** de Facebook:

1. **Compra** (más importante):
   - Evento: `Purchase`
   - Valor: Dinámico (se envía automáticamente)

2. **Inicio de Checkout**:
   - Evento: `InitiateCheckout`
   - Usar para retargeting de carritos abandonados

3. **Lead**:
   - Evento: `Lead`
   - Usar para campañas de captación

### Paso 3: Crear Audiencias Personalizadas

Puedes crear audiencias basadas en:

- Visitantes de los últimos 30 días
- Usuarios que iniciaron checkout pero no compraron
- Usuarios que vieron un pack específico
- Usuarios que completaron registro
- Compradores (para exclusión o lookalike)

---

## 🎯 Retargeting de Carritos Abandonados

El evento `CartAbandonment` se dispara automáticamente cuando:
- Usuario inicia checkout pero no completa
- Usuario cierra la página durante el pago
- Usuario selecciona método de pago pero no continúa

Usa este evento para crear una audiencia de retargeting muy caliente.

---

## 🔍 Debugging

### Ver eventos en tiempo real

1. Ve a **Facebook Business Suite** → **Administrador de Eventos**
2. Selecciona tu Pixel
3. Haz clic en **Test Events**
4. Abre tu sitio en otra pestaña
5. Verás los eventos aparecer en tiempo real

### Verificar en consola

```javascript
// En la consola del navegador
window.fbq  // Debería existir
fbq('track', 'Test')  // Debería funcionar sin error
```

---

## ⚠️ Notas Importantes

1. **El PageView se dispara automáticamente** en cada navegación (SPA)
2. **Purchase es el evento más importante** - asegúrate de que se dispare correctamente
3. **Los valores siempre se envían en MXN** por defecto
4. **El pixel funciona aunque el usuario tenga bloqueador** de algunos trackers
5. **Los eventos custom** aparecen en Facebook como "Eventos personalizados"

---

## 📱 Eventos en el Admin

Todos los eventos también se guardan en Supabase (`user_events`) y puedes verlos en:
- `/admin/tracking` - Ver timeline de eventos
- El funnel de conversión muestra las tasas

---

## 📧 User Data para Mejor Matching

La CAPI envía datos de usuario hasheados (SHA256) para mejor atribución:

| Dato | Parámetro | Se hashea |
|------|-----------|-----------|
| Email | `em` | ✅ Sí |
| Teléfono | `ph` | ✅ Sí |
| Nombre | `fn` | ✅ Sí |
| Apellido | `ln` | ✅ Sí |
| País | `country` | ✅ Sí |
| IP | `client_ip_address` | ❌ No |
| User Agent | `client_user_agent` | ❌ No |
| Cookie _fbp | `fbp` | ❌ No |
| Cookie _fbc | `fbc` | ❌ No |
| External ID | `external_id` | ✅ Sí |

### Cómo enviar userData

```tsx
// Cuando el usuario está autenticado, pasa sus datos
fbTrackPurchase(
  {
    content_name: 'Pack Enero 2026',
    content_ids: ['pack-1'],
    value: 350,
    currency: 'MXN',
  },
  {
    email: 'usuario@email.com',      // Se hashea automáticamente
    phone: '+521234567890',          // Se hashea automáticamente
    firstName: 'Juan',               // Se hashea automáticamente
    lastName: 'Pérez',               // Se hashea automáticamente
    externalId: 'user_abc123',       // Tu ID interno del usuario
  }
)
```

Esto mejora **significativamente** la atribución de conversiones, especialmente para:
- Usuarios en Safari/iOS (que bloquean cookies)
- Usuarios con bloqueadores de ads
- Atribución cross-device

---

## 🔍 Verificar la Integración

### 1. Meta Pixel Helper
Instala la extensión [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) y verifica:
- ✅ Pixel activo (ícono verde)
- ✅ Eventos disparándose con `eventID`

### 2. Test Events en Facebook
1. Ve a **Business Manager** → **Administrador de Eventos**
2. Selecciona tu Pixel
3. Click en **Test Events**
4. Abre tu sitio en otra pestaña
5. Verás eventos del **Navegador** y del **Servidor** con el mismo `event_id`

### 3. Verificar Deduplicación
En Test Events, los eventos deduplicados aparecen como:
- "Received from: Browser" (Pixel)
- "Received from: Server" (CAPI)
- "Deduplicated: Yes" ✅

---

## 📊 Event Match Quality (EMQ)

Facebook te da un score de calidad de matching. Para maximizarlo:

| Mejora | Impacto |
|--------|---------|
| Enviar email hasheado | ⭐⭐⭐⭐⭐ |
| Enviar phone hasheado | ⭐⭐⭐⭐⭐ |
| Enviar external_id | ⭐⭐⭐⭐ |
| Enviar nombre/apellido | ⭐⭐⭐ |
| Enviar IP | ⭐⭐⭐ |
| Enviar User Agent | ⭐⭐ |
| Cookies _fbp/_fbc | ⭐⭐⭐⭐ |

**Objetivo:** EMQ > 6.0 (excelente)

---

¡El tracking está listo para campañas de Facebook Ads NIVEL DIOS! 🚀

La data fluye perfectamente sincronizada entre:
- ✅ Meta Pixel (cliente)
- ✅ Conversions API (servidor)
- ✅ Supabase (base de datos)
- ✅ ManyChat (automatizaciones)
- ✅ Panel de Admin (analytics)
