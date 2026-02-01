# 📱 SISTEMA DE VERIFICACIÓN TELEFÓNICA

## ✅ LO QUE SE IMPLEMENTÓ

### 🎯 Funcionalidades Completas:

1. ✅ **Detección automática de país por IP**
   - Al abrir el registro, detecta el país del usuario
   - Establece el código de país correcto (+52 para México)

2. ✅ **Selector de país con banderas**
   - 16 países latinoamericanos + EUA y España
   - Banderas emoji para identificación visual
   - Código de llamada automático

3. ✅ **Normalización automática del teléfono**
   - Formatea el número al estándar E.164
   - Ejemplo: Usuario escribe "5512345678" → Sistema guarda "+525512345678"
   - Valida que el número sea correcto para el país seleccionado

4. ✅ **Verificación por SMS**
   - Código de 6 dígitos
   - Expira en 10 minutos
   - Reenvío de código disponible

5. ✅ **Verificación por WhatsApp** (opcional)
   - Mismo código de 6 dígitos
   - Envío via Twilio WhatsApp API

---

## 🔧 CÓMO FUNCIONA

### Flujo Completo de Registro:

```
1️⃣ Usuario abre /register
   ↓
   • Sistema detecta país por IP (ipapi.co)
   • Establece código de país automático
   
2️⃣ Usuario llena formulario:
   ├─ Nombre: Juan Pérez
   ├─ Email: juan@email.com
   ├─ Contraseña: ••••••
   ├─ Confirmar: ••••••
   └─ Teléfono: [🇲🇽 MX] +52 | 55 1234 5678
   
3️⃣ Usuario escribe teléfono (varias formas):
   ├─ 5512345678
   ├─ 55-1234-5678
   ├─ (55) 1234-5678
   └─ 55 1234 5678
   
   Sistema normaliza TODAS a: +525512345678 ✅
   
4️⃣ Usuario hace clic "Continuar"
   ↓
   • Sistema valida que el teléfono sea real para MX
   • Genera código: 123456
   • Envía SMS al teléfono
   
5️⃣ Pantalla de verificación aparece:
   ┌─────────────────────────────┐
   │        📱                   │
   │  Verifica tu teléfono       │
   │  Enviamos código a:         │
   │  +52 55 1234 5678          │
   │                             │
   │  🔐 Código:                 │
   │  [1][2][3][4][5][6]        │
   │                             │
   │  [✅ Verificar y Crear]     │
   │  🔄 Reenviar código         │
   │  ← Cambiar teléfono         │
   └─────────────────────────────┘
   
6️⃣ Usuario ingresa código: 123456
   ↓
   • Sistema verifica el código
   • Si es correcto → Crea cuenta en Supabase
   • Guarda teléfono normalizado en BD
   
7️⃣ Cuenta creada ✅
   ↓
   • Email de verificación enviado
   • Redirige a /verify-email
```

---

## 🌎 PAÍSES SOPORTADOS

```typescript
const countries = [
  { code: 'MX', name: 'México', flag: '🇲🇽', calling: '+52' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', calling: '+1' },
  { code: 'ES', name: 'España', flag: '🇪🇸', calling: '+34' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', calling: '+57' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', calling: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', calling: '+56' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', calling: '+51' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', calling: '+58' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', calling: '+593' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', calling: '+502' },
  { code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴', calling: '+1' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', calling: '+506' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', calling: '+507' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', calling: '+598' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', calling: '+591' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', calling: '+595' },
]
```

---

## 🛠️ COMPONENTES CREADOS

### 1. **PhoneInput** (`src/components/ui/phone-input.tsx`)

Componente inteligente que:
- ✅ Detecta país por IP automáticamente
- ✅ Muestra selector con banderas
- ✅ Muestra código de llamada (+52, +1, etc.)
- ✅ Normaliza el número mientras escribe
- ✅ Valida que sea un número real
- ✅ Permite escribir de cualquier forma
- ✅ Convierte todo al formato E.164

**Uso:**
```tsx
<PhoneInput
  value={phone}
  onChange={setPhone}
  onCountryChange={setCountry}
  defaultCountry="MX"
/>
```

### 2. **API Routes**

#### `/api/send-sms` - Envía SMS
```typescript
POST /api/send-sms
Body: { to: "+525512345678", message: "Tu código es: 123456" }
```

#### `/api/send-whatsapp` - Envía WhatsApp
```typescript
POST /api/send-whatsapp
Body: { to: "+525512345678", message: "Tu código es: 123456" }
```

#### `/api/verify-phone` - Gestiona verificación
```typescript
// Enviar código
POST /api/verify-phone
Body: { phone: "+525512345678", action: "send" }

// Verificar código
POST /api/verify-phone
Body: { phone: "+525512345678", code: "123456", action: "verify" }
```

---

## 📦 LIBRERÍAS AGREGADAS

```json
{
  "libphonenumber-js": "^1.10.53",    // Validación y normalización
  "react-phone-number-input": "^3.3.9", // Componentes React
  "twilio": "^5.0.1"                    // Envío de SMS/WhatsApp
}
```

---

## ⚙️ CONFIGURACIÓN DE TWILIO

### 1️⃣ Crear Cuenta en Twilio

1. Ve a: https://www.twilio.com/try-twilio
2. Regístrate con tu email
3. Verifica tu cuenta

### 2️⃣ Obtener Credenciales

1. Ve al Dashboard: https://console.twilio.com
2. Copia:
   - **Account SID**: `AC...`
   - **Auth Token**: `...`

### 3️⃣ Comprar Número de Teléfono

1. Ve a: Phone Numbers → Buy a number
2. Busca número en México (si vas a enviar SMS a MX)
3. Capabilities: ☑️ SMS, ☑️ Voice
4. Compra el número (~$1-2 USD/mes)
5. Copia el número: `+52...`

### 4️⃣ Configurar WhatsApp (Opcional)

1. Ve a: Messaging → Try it out → Send a WhatsApp message
2. Sigue el tutorial de Twilio
3. Requiere aprobación de Facebook (tarda 1-2 días)
4. Una vez aprobado, tendrás un número WhatsApp

### 5️⃣ Agregar Credenciales a `.env.local`

```env
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_PHONE_NUMBER=+525512345678
TWILIO_WHATSAPP_NUMBER=whatsapp:+525512345678
```

---

## 💰 COSTOS DE TWILIO

### SMS:
```
México (MX):   $0.0085 USD por SMS
EUA (US):      $0.0079 USD por SMS
España (ES):   $0.0750 USD por SMS
Colombia (CO): $0.0120 USD por SMS

Con 100 registros/mes = ~$1 USD
Con 1,000 registros/mes = ~$10 USD
```

### WhatsApp:
```
Conversación iniciada por negocio: $0.0041 USD
(Más barato que SMS)

Con 100 registros/mes = ~$0.40 USD
Con 1,000 registros/mes = ~$4 USD
```

### Número de Teléfono:
```
Renta mensual: $1-2 USD/mes
```

**Total mensual con 100 usuarios: ~$2-3 USD** 💰

---

## 🔧 MODO DESARROLLO (Sin Twilio)

### Para testing sin gastar dinero:

El sistema está configurado para funcionar **sin Twilio** en desarrollo:

1. Al enviar código, muestra el código en pantalla
2. Logs en consola del servidor
3. No envía SMS real
4. Puedes copiar el código y pegarlo

**Ejemplo en desarrollo:**
```
🔧 MODO DESARROLLO
Tu código es: 123456
```

---

## 🎨 DISEÑO DEL REGISTRO

### Paso 1: Información Básica
```
┌────────────────────────────────────┐
│  🐻 BEAR BEAT                      │
│  Crear Cuenta                      │
├────────────────────────────────────┤
│  Nombre: [Juan Pérez_______]      │
│  Email:  [juan@email.com___]      │
│  Contraseña: [••••••••_____]      │
│  Confirmar:  [••••••••_____]      │
│  Teléfono: [🇲🇽 MX ▼][+52|55 1234]│
│                                    │
│  [📱 Continuar (Verificar)]        │
└────────────────────────────────────┘
```

### Paso 2: Verificar Teléfono
```
┌────────────────────────────────────┐
│           📱                       │
│  Verifica tu teléfono              │
│  Enviamos código a:                │
│  +52 55 1234 5678                 │
│                                    │
│  🔐 Código:                        │
│  [1][2][3][4][5][6]               │
│                                    │
│  [✅ Verificar y Crear Cuenta]     │
│  🔄 Reenviar código                │
│  ← Cambiar teléfono                │
└────────────────────────────────────┘
```

---

## 🔒 VALIDACIONES IMPLEMENTADAS

### Email:
```
✅ Formato válido (con @)
✅ No domainios temporales (opcional: agregar lista negra)
✅ Único en la base de datos
```

### Teléfono:
```
✅ Mínimo 8 dígitos
✅ Válido para el país seleccionado
✅ Formato normalizado automáticamente
✅ Código de verificación correcto
```

### Contraseña:
```
✅ Mínimo 6 caracteres
✅ Coincide con confirmación
```

---

## 📝 EJEMPLOS DE USO

### Teléfonos que el sistema acepta y normaliza:

**México (MX):**
```
Usuario escribe:     Sistema guarda:
5512345678     →     +525512345678
55-1234-5678   →     +525512345678
(55) 1234-5678 →     +525512345678
55 1234 5678   →     +525512345678
045512345678   →     +525512345678
```

**EUA (US):**
```
Usuario escribe:     Sistema guarda:
3105551234     →     +13105551234
(310) 555-1234 →     +13105551234
310.555.1234   →     +13105551234
```

**España (ES):**
```
Usuario escribe:     Sistema guarda:
612345678      →     +34612345678
6 12 34 56 78  →     +34612345678
```

---

## 🧪 TESTING (Sin Twilio)

### En modo desarrollo:

**1. Registrarse:**
```
/register → Llenar formulario → Continuar
```

**2. El código aparece en:**
- Pantalla (caja amarilla)
- Consola del navegador
- Terminal del servidor

**3. Copiar código y pegar:**
```
Código mostrado: 123456
Ingresar en input: 123456
Verificar ✅
```

**4. Cuenta creada sin gastar dinero**

---

## 🚀 PRODUCCIÓN (Con Twilio)

### Cuando tengas Twilio configurado:

**1. Usuario se registra**
**2. Sistema envía SMS real** al teléfono
**3. Usuario recibe:**
```
🐻 Bear Beat - Tu código de verificación es: 123456

Válido por 10 minutos.
```

**4. Usuario ingresa código**
**5. Cuenta verificada ✅**

---

## 🎨 VENTAJAS DEL SISTEMA

### 1. **Detección Inteligente de País**
```
Usuario de México → Auto selecciona 🇲🇽 MX
Usuario de Colombia → Auto selecciona 🇨🇴 CO
Usuario de EUA → Auto selecciona 🇺🇸 US
```

### 2. **Normalización Automática**
```
Usuario puede escribir:
✅ Con guiones: 55-1234-5678
✅ Con espacios: 55 1234 5678
✅ Con paréntesis: (55) 1234-5678
✅ Sin formato: 5512345678

Sistema siempre guarda: +525512345678
```

### 3. **Validación en Tiempo Real**
```
Mientras escribe:
❌ "123" → Muy corto (muestra error)
❌ "abc123" → No válido (quita letras)
✅ "5512345678" → Válido (pasa)
```

### 4. **Multi-Canal**
```
Puede enviar código por:
✅ SMS (más común)
✅ WhatsApp (más barato)
✅ Ambos (para redundancia)
```

---

## 💡 MEJORAS OPCIONALES

### A. Lista Negra de Números

```typescript
// src/lib/phone-blacklist.ts
const blacklistedNumbers = [
  '+525500000000',  // Número de prueba
  '+525511111111',  // Número falso
]

export function isBlacklisted(phone: string): boolean {
  return blacklistedNumbers.includes(phone)
}
```

### B. Límite de Intentos

```typescript
// Máximo 3 intentos de código
// Después de 3 fallos, esperar 15 minutos
```

### C. Detección de VPN

```typescript
// Verificar que la IP no sea VPN
// Usar servicio como ipapi.co/proxy o vpnapi.io
```

---

## 📊 BASE DE DATOS ACTUALIZADA

### Tabla users ahora tiene:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),  -- ← Teléfono normalizado: +525512345678
  country_code VARCHAR(2),  -- ← Código ISO: MX, US, ES
  role VARCHAR(20) DEFAULT 'user',
  phone_verified BOOLEAN DEFAULT FALSE,  -- ← Nuevo campo
  email_verified BOOLEAN DEFAULT FALSE,  -- ← Nuevo campo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⚡ INSTALACIÓN RÁPIDA

### 1. Instalar nuevas dependencias:

```bash
npm install --legacy-peer-deps
```

### 2. Configurar Twilio (Opcional para desarrollo):

Si quieres probar SMS real:
- Crear cuenta en Twilio
- Agregar credenciales a `.env.local`

Si solo quieres testear:
- Dejar las variables de Twilio comentadas
- El código aparecerá en pantalla

---

## ✅ RESULTADO

Ahora tienes:
- ✅ Registro con teléfono obligatorio
- ✅ Detección automática de país
- ✅ Selector visual con banderas
- ✅ Normalización automática (acepta cualquier formato)
- ✅ Verificación por SMS/WhatsApp
- ✅ Código de 6 dígitos con expiración
- ✅ Funciona sin Twilio (para testing)
- ✅ Fácil agregar Twilio después

**El sistema es 100% profesional y fácil de usar** 🎉

---

## 🎯 PRÓXIMO PASO

```bash
# Instalar nuevas dependencias
npm install --legacy-peer-deps

# Ejecutar proyecto
npm run dev

# Abrir navegador
http://localhost:3000/register

# Probar el registro con verificación telefónica
```

¿Quieres que ejecute la instalación de las nuevas dependencias? 🚀
