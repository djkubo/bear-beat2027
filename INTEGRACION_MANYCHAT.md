# 🤖 Integración ManyChat - Bear Beat

## 📋 Resumen

Bear Beat está completamente integrado con ManyChat para:
- **Rastrear cada acción** del usuario en el sitio
- **Sincronizar usuarios** automáticamente (crear/actualizar)
- **Etiquetar usuarios** según sus acciones para flujos automáticos
- **Almacenar datos personalizados** (email, teléfono, compras, etc.)

---

## ⚙️ Configuración

### Variables de Entorno (.env.local)

```env
# ManyChat
NEXT_PUBLIC_MANYCHAT_PAGE_ID=104901938679498
MANYCHAT_API_KEY=ccb70598a0c14bcf3988c5a8d117cc63
```

### Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| `src/lib/manychat.ts` | Servicio completo para API de ManyChat |
| `src/app/api/manychat/route.ts` | API Route para llamadas server-side |
| `src/components/manychat/ManyChat.tsx` | Widget y hooks para cliente |
| `src/lib/tracking.ts` | Sistema de tracking (Supabase + ManyChat) |

---

## 🏷️ Tags Predefinidos

Estos tags se agregan automáticamente según las acciones del usuario:

### Etapa del Funnel
| Tag | Descripción |
|-----|-------------|
| `bb_visitor` | Visitante anónimo |
| `bb_lead` | Lead (dio email/teléfono) |
| `bb_customer` | Cliente (compró) |
| `bb_repeat_customer` | Cliente recurrente |

### Acciones
| Tag | Cuándo se agrega |
|-----|------------------|
| `bb_viewed_landing` | Visitó la landing page |
| `bb_clicked_cta` | Hizo clic en un CTA |
| `bb_started_checkout` | Inició el checkout |
| `bb_payment_intent` | Creó intención de pago |
| `bb_payment_success` | Pago exitoso |
| `bb_registered` | Se registró |
| `bb_logged_in` | Inició sesión |
| `bb_downloaded` | Descargó contenido |

### Método de Pago
| Tag | Descripción |
|-----|-------------|
| `bb_paid_card` | Pagó con tarjeta |
| `bb_paid_oxxo` | Pagó en OXXO |
| `bb_paid_spei` | Pagó con SPEI |
| `bb_paid_paypal` | Pagó con PayPal |

### País
| Tag | Descripción |
|-----|-------------|
| `bb_country_mx` | Usuario de México |
| `bb_country_us` | Usuario de USA |
| `bb_country_other` | Otro país |

---

## 📊 Custom Fields

Campos personalizados que se actualizan automáticamente:

| Campo | Descripción |
|-------|-------------|
| `bb_last_page` | Última página visitada |
| `bb_total_purchases` | Total de compras |
| `bb_total_spent` | Total gastado |
| `bb_last_pack` | Último pack comprado |
| `bb_referrer` | Fuente de referencia |
| `bb_user_id` | ID del usuario en Supabase |
| `bb_country` | País del usuario |
| `bb_registration_date` | Fecha de registro |
| `bb_last_login` | Último login |

---

## 🔄 Flujo de Datos

### 1. Usuario llega al sitio
```
Usuario visita → trackPageView() → 
  ↳ Guarda en Supabase (user_events)
  ↳ Si tiene email/phone → Actualiza ManyChat
```

### 2. Usuario hace clic en CTA
```
Click en "COMPRAR" → trackCTAClick() →
  ↳ Guarda en Supabase
  ↳ Si tiene email/phone → Agrega tag bb_clicked_cta
```

### 3. Usuario inicia checkout
```
Inicia checkout → trackStartCheckout() →
  ↳ Guarda en Supabase
  ↳ Si tiene email/phone → Agrega tag bb_started_checkout
```

### 4. Usuario completa compra
```
Pago exitoso → complete-purchase page →
  ↳ syncUserWithManyChat() → Crea/actualiza suscriptor
  ↳ trackPurchaseWithManyChat() → Agrega tags de compra
  ↳ Remueve tag bb_lead, agrega bb_customer
```

---

## 🛠️ Uso en Código

### Desde Componentes (Cliente)

```typescript
import { useManyChat } from '@/components/manychat/ManyChat'

function MyComponent() {
  const { syncUser, trackEvent, trackPurchase } = useManyChat()
  
  // Sincronizar usuario
  await syncUser({
    email: 'user@example.com',
    phone: '+521234567890',
    firstName: 'Juan',
    lastName: 'Pérez',
  })
  
  // Trackear evento
  await trackEvent({
    email: 'user@example.com',
    eventType: 'page_view',
    eventData: { page: 'checkout' }
  })
}
```

### Desde Tracking System

```typescript
import { 
  trackPageView, 
  trackCTAClick, 
  syncUserWithManyChat,
  trackPurchaseWithManyChat 
} from '@/lib/tracking'

// Trackear página (va a Supabase + ManyChat si hay email)
trackPageView('Landing Page', 'user@example.com', '+521234567890')

// Trackear CTA
trackCTAClick('Comprar Ahora', 'hero-section', 'user@example.com')

// Sincronizar usuario nuevo
await syncUserWithManyChat({
  email: 'user@example.com',
  phone: '+521234567890',
  firstName: 'Juan',
  lastName: 'Pérez',
  country: 'MX',
  userId: 'supabase-user-id'
})

// Trackear compra
await trackPurchaseWithManyChat({
  email: 'user@example.com',
  phone: '+521234567890',
  packName: 'Video Remixes Enero 2026',
  amount: 350,
  currency: 'MXN',
  paymentMethod: 'oxxo'
})
```

### Desde Server (API Routes)

```typescript
import { 
  upsertSubscriber, 
  addTagByName,
  sendFlow 
} from '@/lib/manychat'

// Crear/actualizar suscriptor
const subscriber = await upsertSubscriber({
  email: 'user@example.com',
  phone: '+521234567890',
  first_name: 'Juan'
})

// Agregar tag
await addTagByName(subscriber.id, 'bb_customer')

// Enviar flujo automático
await sendFlow(subscriber.id, 'flow_bienvenida')
```

---

## 🎯 Flujos de ManyChat Recomendados

Crea estos flujos en ManyChat para automatizar la comunicación:

### 1. Flujo de Bienvenida
- **Trigger**: Tag `bb_registered`
- **Acción**: Enviar mensaje de bienvenida por WhatsApp
- **Contenido**: "¡Hola {first_name}! Bienvenido a Bear Beat..."

### 2. Flujo de Carrito Abandonado
- **Trigger**: Tag `bb_started_checkout` + NO `bb_payment_success` después de 1 hora
- **Acción**: Enviar recordatorio
- **Contenido**: "¡Hola! Vimos que dejaste tu pack pendiente..."

### 3. Flujo de Compra Exitosa
- **Trigger**: Tag `bb_payment_success`
- **Acción**: Enviar confirmación y guía de descarga
- **Contenido**: "¡Gracias por tu compra! Tu acceso está listo..."

### 4. Flujo de Seguimiento Post-Descarga
- **Trigger**: Tag `bb_downloaded`
- **Acción**: Enviar encuesta de satisfacción después de 24h
- **Contenido**: "¿Qué te parecieron los videos?"

### 5. Flujo de Nuevo Pack Disponible
- **Trigger**: Manual o programado
- **Filtro**: Tag `bb_customer`
- **Acción**: Notificar nuevo pack
- **Contenido**: "¡Nuevo pack de febrero disponible!"

---

## 📱 Widget de Chat

El widget de ManyChat se carga automáticamente en todas las páginas:

```tsx
// Ya incluido en layout.tsx
import { ManyChatWidget } from '@/components/manychat/ManyChat'

<ManyChatWidget />
```

El widget aparece en la esquina inferior derecha y permite:
- Chat en vivo con el bot
- Continuar conversaciones de WhatsApp
- Mostrar ofertas personalizadas

---

## 🔍 Debugging

### Ver logs de ManyChat

Todos los eventos se registran en console:
```
ManyChat: Subscriber created: 123456789
ManyChat: Tag "bb_customer" added to subscriber 123456789
ManyChat: Purchase tracked for subscriber: 123456789
```

### Verificar en ManyChat Dashboard

1. Ve a **Contacts** en ManyChat
2. Busca por email o teléfono
3. Verifica los **Tags** asignados
4. Revisa los **Custom Fields** actualizados

### API de prueba

```bash
# Ver configuración disponible
curl http://localhost:3000/api/manychat?action=config

# Buscar suscriptor
curl -X POST http://localhost:3000/api/manychat \
  -H "Content-Type: application/json" \
  -d '{"action": "find_subscriber", "field": "email", "value": "test@example.com"}'
```

---

## ⚠️ Notas Importantes

1. **ManyChat requiere email O teléfono** para crear suscriptores
2. **Los eventos de visitantes anónimos** solo se guardan en Supabase hasta que proporcionen datos
3. **El widget** puede tardar unos segundos en cargar (estrategia `lazyOnload`)
4. **Los tags** se crean automáticamente si no existen en ManyChat
5. **Los custom fields** deben existir en ManyChat (créalos manualmente primero)

---

## 🚀 Próximos Pasos

1. **Crear Custom Fields en ManyChat**:
   - Ve a Settings → Custom Fields
   - Crea cada campo listado en la tabla de Custom Fields

2. **Crear Flujos Automáticos**:
   - Usa los tags como triggers
   - Personaliza mensajes con custom fields

3. **Probar Integración**:
   - Haz una compra de prueba
   - Verifica que el usuario aparezca en ManyChat
   - Confirma que los tags y fields están correctos

4. **Monitorear en Admin**:
   - `/admin/tracking` muestra el funnel
   - Compara con datos de ManyChat

---

¿Preguntas? La integración está lista para usar. Solo necesitas crear los custom fields y flujos en ManyChat.
