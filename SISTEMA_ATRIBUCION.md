# 🎯 Sistema de Atribución de Tráfico - Bear Beat

## ✅ Qué Detectamos Automáticamente

### 📱 Redes Sociales (Sin necesidad de UTMs)

| Plataforma | Detección Automática |
|------------|---------------------|
| 📘 Facebook | `facebook.com`, `fb.com`, `fb.me`, `l.facebook.com` |
| 📸 Instagram | `instagram.com`, `l.instagram.com` |
| 💬 Messenger | `messenger.com`, `lm.facebook.com` |
| 🧵 Threads | `threads.net` |
| 💚 WhatsApp | `whatsapp.com`, `wa.me`, `api.whatsapp.com` |
| 🎵 TikTok | `tiktok.com`, `vm.tiktok.com` |
| 🐦 Twitter/X | `twitter.com`, `x.com`, `t.co` |
| ✈️ Telegram | `telegram.org`, `t.me` |
| ▶️ YouTube | `youtube.com`, `youtu.be` |
| 💼 LinkedIn | `linkedin.com`, `lnkd.in` |
| 📌 Pinterest | `pinterest.com`, `pin.it` |
| 🤖 Reddit | `reddit.com` |
| 👻 Snapchat | `snapchat.com` |

### 🔍 Buscadores

| Buscador | Detección |
|----------|-----------|
| Google | `google.com`, `google.com.mx`, `google.es` |
| Bing | `bing.com` |

### 💳 Click IDs de Anuncios

| Plataforma | Parámetro | Ejemplo |
|------------|-----------|---------|
| Facebook/Meta Ads | `fbclid` | `?fbclid=ABC123...` |
| Google Ads | `gclid` | `?gclid=CjwKCA...` |
| TikTok Ads | `ttclid` | `?ttclid=123...` |
| LinkedIn Ads | `li_fat_id` | `?li_fat_id=...` |
| Twitter Ads | `twclid` | `?twclid=...` |
| Microsoft/Bing Ads | `msclkid` | `?msclkid=...` |

---

## 📊 UTM Parameters

Para tracking más específico, usa UTMs en tus URLs:

```
https://bearbeat.com?utm_source=facebook&utm_medium=cpc&utm_campaign=enero2026&utm_content=video1
```

| Parámetro | Uso | Ejemplo |
|-----------|-----|---------|
| `utm_source` | Fuente de tráfico | facebook, google, tiktok, email |
| `utm_medium` | Medio | cpc, social, organic, email, referral |
| `utm_campaign` | Nombre de campaña | enero2026, blackfriday |
| `utm_content` | Variación del anuncio | video1, imagen2, carousel |
| `utm_term` | Keywords | dj videos, remixes |

---

## 🔄 Cómo Funciona

```
Usuario llega a Bear Beat
         ↓
┌─────────────────────────────────────┐
│   AttributionTracker captura:       │
│   - URL params (utm_*, fbclid...)   │
│   - document.referrer               │
│   - Dispositivo/Browser/OS          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│   Guarda en localStorage:           │
│   - Primera visita (conversión)     │
│   - Última visita (optimización)    │
└─────────────────────────────────────┘
         ↓
    Cada evento incluye atribución
         ↓
┌──────────┬──────────┬──────────────┐
│ Supabase │ ManyChat │ Facebook     │
│ (DB)     │ (Flows)  │ (CAPI+Pixel) │
└──────────┴──────────┴──────────────┘
```

---

## 📈 Datos que se Capturan

### En Cada Evento (user_events)

```json
{
  "event_type": "payment_success",
  "event_data": {
    "attribution": {
      "source": "facebook",
      "medium": "cpc",
      "campaign": "enero2026",
      "is_ad": true,
      "display_name": "Facebook Ads"
    }
  },
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "enero2026"
}
```

### En Cada Usuario (users)

```json
{
  "first_utm_source": "facebook",
  "first_utm_medium": "cpc",
  "first_utm_campaign": "enero2026",
  "first_landing_page": "/",
  "signup_source": "facebook"
}
```

---

## 🎯 Panel de Admin

Ve a `/admin/attribution` para ver:

- **Rendimiento por Fuente**: Visitas, conversiones y revenue por cada fuente
- **Top Campañas**: Qué campañas están convirtiendo mejor
- **Últimas Visitas**: Timeline de usuarios con su fuente de tráfico

---

## 💰 Modelo de Atribución

Guardamos **dos tipos de atribución**:

### 1. First-Touch (Conversión)
- **Cuándo**: La primera vez que el usuario visita
- **Para qué**: Saber qué fuente trajo al cliente originalmente
- **Uso**: Atribuir la venta a la fuente que lo descubrió

### 2. Last-Touch (Optimización)
- **Cuándo**: La visita donde convierte
- **Para qué**: Saber qué fuente cerró la venta
- **Uso**: Optimizar campañas de retargeting

---

## 🛠️ Uso en Código

### Obtener Atribución Actual

```typescript
import { getTrafficSource, getAttributionForAPI } from '@/lib/attribution'

// Fuente formateada para mostrar
const source = getTrafficSource()
// { source: 'facebook', medium: 'cpc', isAd: true, displayName: 'Facebook Ads', icon: '📘' }

// Datos para enviar a APIs
const apiData = getAttributionForAPI()
// { utm_source: 'facebook', utm_medium: 'cpc', fbclid: '...', first_source: '...' }
```

### Hook en Componentes

```typescript
import { useAttribution } from '@/components/tracking/AttributionTracker'

function MyComponent() {
  const { attribution, trafficSource, forAPI } = useAttribution()
  
  return (
    <div>
      Llegaste desde: {trafficSource?.displayName} {trafficSource?.icon}
    </div>
  )
}
```

---

## 📱 Ejemplos de URLs

### Facebook Ads
```
https://bearbeat.com?utm_source=facebook&utm_medium=cpc&utm_campaign=enero2026&fbclid=ABC123
```

### TikTok Ads
```
https://bearbeat.com?utm_source=tiktok&utm_medium=cpc&utm_campaign=viral2026&ttclid=XYZ789
```

### Email Marketing
```
https://bearbeat.com?utm_source=email&utm_medium=newsletter&utm_campaign=black_friday
```

### WhatsApp Compartido
```
https://bearbeat.com?utm_source=whatsapp&utm_medium=share&utm_campaign=referral
```

### Link Orgánico de Instagram
```
https://bearbeat.com?utm_source=instagram&utm_medium=bio_link
```

---

## 🗄️ SQL para Supabase

Ejecuta `supabase/schema_attribution.sql` para agregar:

- Campos de atribución a `user_events`
- Campos de atribución a `users`
- Campos de atribución a `purchases`
- Función `get_traffic_stats()` para estadísticas
- Función `get_top_campaigns()` para top campañas
- Función `get_user_journey()` para ver el journey de un usuario

---

## ✅ Beneficios

1. **Saber de dónde vienen** - Facebook, TikTok, WhatsApp, etc.
2. **Medir ROI de anuncios** - Qué campañas generan ventas
3. **Optimizar presupuesto** - Invertir más en lo que funciona
4. **Entender el journey** - De dónde llegó vs. dónde convirtió
5. **Automatizar en ManyChat** - Flujos según la fuente
6. **Mejorar atribución en Facebook** - Datos server-side para mejor matching

---

¡Ahora sabes exactamente de dónde viene cada peso que entra! 🎯💰
