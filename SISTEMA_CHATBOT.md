# 🤖 Sistema de Chatbot Inteligente - Bear Beat

## 💬 Canales de Soporte

El chatbot funciona en DOS canales:

### 1. Chat Web (Widget en la página)
- Botón flotante azul en esquina inferior derecha
- Aparece en todas las páginas
- Respuesta inmediata
- Mismo motor que ManyChat

### 2. ManyChat (WhatsApp/Messenger)
- Integrado via webhook
- Sincroniza con tags y custom fields
- Ideal para seguimiento automático

---

## ✅ Funcionalidades

El chatbot puede:
- **Detectar intenciones** de los mensajes
- **Responder automáticamente** con información relevante
- **Ejecutar acciones** (verificar pagos, resetear contraseñas)
- **Escalar a humano** cuando es necesario
- **Guardar conversaciones** para análisis
- **Aprender** de mensajes no entendidos

---

## 🎯 Intenciones Detectadas

| Intención | Keywords | Acción |
|-----------|----------|--------|
| 🔑 `password_reset` | contraseña, olvidé, acceso | Envía link de reset |
| 💳 `payment_no_access` | pagué, no acceso, mi compra | Verifica pago en DB |
| 📥 `download_issue` | descarga, ftp, filezilla | Guía de descarga |
| 💰 `price_question` | precio, cuánto, cuesta | Info de precio |
| 🏦 `payment_methods` | cómo pago, oxxo, spei | Métodos disponibles |
| 📦 `content_question` | qué incluye, géneros | Info del contenido |
| ❓ `how_it_works` | cómo funciona, qué es | Explicación |
| 🧾 `invoice_request` | factura, rfc, cfdi | Registra solicitud |
| 😤 `complaint` | queja, molesto, estafa | Escala a humano |
| 👋 `greeting` | hola, buenas | Bienvenida |
| 👤 `human_request` | agente, persona real | Escala a humano |

---

## 🔄 Flujo del Chatbot

```
Usuario envía mensaje (WhatsApp/Messenger)
              ↓
        ManyChat recibe
              ↓
        Webhook → /api/manychat/webhook
              ↓
┌─────────────────────────────────────┐
│  1. Obtener/Crear conversación      │
│  2. Detectar intención              │
│  3. Buscar en Knowledge Base        │
│  4. Ejecutar acción si aplica       │
│  5. Generar respuesta               │
│  6. Guardar mensaje y respuesta     │
│  7. Actualizar tags en ManyChat     │
└─────────────────────────────────────┘
              ↓
        Respuesta → ManyChat → Usuario
```

---

## ⚡ Acciones Automáticas

### 1. Verificar Pago (`verify_payment`)

```
Usuario: "Ya pagué pero no tengo acceso"
Bot: Busca en purchases y pending_purchases
  → Si encuentra: "✅ Encontré tu compra del Pack X..."
  → Si no encuentra: "🔍 No encontré pago. Dame tu email..."
```

### 2. Resetear Contraseña (`password_reset`)

```
Usuario: "Olvidé mi contraseña"
Bot: Pide email → Busca usuario → Envía link de reset
  → Si encuentra: "✅ Te envié email a xxx@..."
  → Si no encuentra: "🤔 No encontré cuenta con ese email..."
```

### 3. Ayuda con Descargas (`download_help`)

```
Usuario: "No puedo descargar"
Bot: Envía guía completa de descarga web y FTP
```

### 4. Escalar a Humano (`escalate_to_human`)

```
Usuario: "Quiero hablar con alguien"
Bot: Marca conversación como needs_human = true
     Agrega tag bb_needs_human en ManyChat
     Notifica en admin panel
```

---

## 💾 Base de Datos

### Tabla `conversations`

```sql
- id
- manychat_subscriber_id
- user_id (si está registrado)
- phone, email, name
- status: active | resolved | pending_human
- current_intent
- needs_human: boolean
- total_messages, bot_messages, human_messages
- first_message_at, last_message_at
```

### Tabla `messages`

```sql
- id
- conversation_id
- content
- direction: inbound | outbound
- sender_type: user | bot | human_agent
- detected_intent
- intent_confidence
- bot_response
- bot_action_taken
- bot_action_result
- response_time_ms
```

### Tabla `intents`

```sql
- name
- display_name
- category: support | sales | info | complaint
- keywords[]
- auto_response
- auto_action
- requires_human
```

### Tabla `knowledge_base`

```sql
- category
- question
- question_variations[]
- keywords[]
- answer
- short_answer (para WhatsApp)
- times_used
```

---

## 📊 Panel de Admin

Ve a `/admin/chatbot` para ver:

- **KPIs**: Conversaciones, resueltas, pendientes, tasa de resolución
- **Esperando Humano**: Conversaciones que necesitan atención
- **Top Intenciones**: Qué preguntan más los usuarios
- **Sin Intención**: Mensajes que el bot no entendió (para mejorar)
- **Conversaciones Recientes**: Lista de chats

---

## ⚙️ Configuración del Webhook

### En ManyChat:

1. Ve a **Settings** → **API**
2. En **Webhooks**, agrega:
   ```
   URL: https://tudominio.com/api/manychat/webhook
   Events: new_message, message_sent
   ```
3. Guarda y prueba

### En Bear Beat:

El webhook está en: `/api/manychat/webhook`

Ya está configurado para:
- Recibir mensajes
- Procesar con el chatbot
- Responder automáticamente
- Actualizar tags en ManyChat

---

## 🏷️ Tags que se Agregan en ManyChat

Según la intención detectada:

| Intención | Tag |
|-----------|-----|
| password_reset | `bb_needs_support` |
| payment_no_access | `bb_payment_issue` |
| download_issue | `bb_download_issue` |
| price_question | `bb_interested_buyer` |
| payment_methods | `bb_interested_buyer` |
| content_question | `bb_interested_buyer` |
| complaint | `bb_complaint` |
| human_request | `bb_needs_human` |

También se guarda `bb_last_intent` como custom field.

---

## 📈 Mejorando el Bot

### Ver qué no entiende

En `/admin/chatbot` hay una sección "Mensajes Sin Intención Detectada".

Usa estos mensajes para:
1. Agregar nuevos keywords a intenciones existentes
2. Crear nuevas intenciones si es un tema recurrente
3. Agregar preguntas a la Knowledge Base

### Agregar Keywords

En el archivo `src/lib/chatbot.ts`, busca la intención y agrega keywords:

```typescript
{
  name: 'password_reset',
  keywords: ['contraseña', 'password', 'olvidé', 'AGREGAR_NUEVO_KEYWORD_AQUI'],
  ...
}
```

### Agregar al Knowledge Base

Inserta en la tabla `knowledge_base`:

```sql
INSERT INTO knowledge_base (category, question, keywords, answer, short_answer)
VALUES (
  'pagos',
  '¿Puedo pagar en dólares?',
  ARRAY['dólares', 'usd', 'dolares', 'moneda'],
  'Sí, aceptamos pagos en dólares...',
  'Sí, aceptamos USD. El precio es $19 USD.'
);
```

---

## 🔐 Seguridad

- El webhook solo acepta POST de ManyChat
- Los datos sensibles (contraseñas) nunca se muestran
- Las acciones verifican permisos antes de ejecutar
- Se guardan logs de todas las acciones

---

## 🚀 SQL para Supabase

Ejecuta `supabase/schema_chatbot.sql` para crear:
- Tablas de conversaciones y mensajes
- Intenciones predefinidas
- Knowledge base inicial
- Funciones y triggers

---

¡El chatbot está listo para dar soporte nivel dios! 🤖✨
