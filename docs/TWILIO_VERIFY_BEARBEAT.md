# Twilio Verify – Bear Beat (referencia)

Configuración de Twilio para verificación OTP en registro (SMS y WhatsApp).

## Variables de entorno necesarias

En **Render** (o `.env.local`) configura:

| Variable | Dónde obtenerla | Ejemplo (no uses este valor, usa el tuyo) |
|----------|----------------|-------------------------------------------|
| `TWILIO_ACCOUNT_SID` | Console → Auth Tokens → Account SID (Live o Test) | `AC1732...` |
| `TWILIO_AUTH_TOKEN` | Console → Auth Tokens → Auth token (Live o Test) | *(sensible, nunca lo subas a git)* |
| `TWILIO_VERIFY_SERVICE_SID` | Verify → Services → tu servicio (SID empieza por `VA`) | `VA71b8f5db6c57dd1ab1eb3eb24422b9c4` |

- **Producción:** usa **Live credentials** (Account SID + Auth token Live).
- **Desarrollo/pruebas:** puedes usar **Test credentials** para no consumir saldo.
- **Nunca** commitees el Auth Token ni el API Key Secret; solo en `.env.local` (local) o en las variables de entorno del host (Render, etc.).

Con estas tres variables, `/api/verify-phone` usa la **Twilio Verify API**:
- **action: "send"** → envía código por SMS (por defecto) o por WhatsApp si se pasa `channel: "whatsapp"`.
- **action: "verify"** → comprueba el código con Twilio (sin guardar códigos en el servidor).

## Referencia de servicios Bear Beat (Twilio)

| Uso | Tipo | SID / Número |
|-----|------|--------------|
| **Verify OTP (SMS)** | Verify Service | `VA71b8f5db6c57dd1ab1eb3eb24422b9c4` |
| **Verify OTP (WhatsApp)** | Mismo servicio Verify con canal `whatsapp` | Mismo `TWILIO_VERIFY_SERVICE_SID` |
| **WhatsApp Verify Bearbeat** | Messaging Service | `MG9416d149bca2a80755aa76d83e25b997` |
| **WhatsApp Sender** | Número | `+15138776826` |
| **Bearbeat WhatsApp Message** | Messaging Service | `MG6c374566cf763fff7069fac96343f31e` |

Para **Verify API** solo hace falta el **Verify Service SID** (`VA...`). Los Messaging Service SID (`MG...`) y el número WhatsApp se usan en otras rutas (p. ej. `send-whatsapp`) si las tienes.

## Habilitar WhatsApp en Verify

Si quieres enviar el OTP por WhatsApp con Verify:

1. En Twilio: **Verify** → **Services** → tu servicio (VA71...).
2. En **Channels** activa **WhatsApp** y asocia el número/sender que tengas aprobado (ej. +15138776826).

En el frontend, al llamar a `/api/verify-phone` con `action: "send"`, envía `channel: "whatsapp"` para que Twilio envíe el código por WhatsApp en lugar de SMS.

## Webhook (inbound)

El webhook **WhatsApp Verify Bearbeat** (`MG9416d149bca2a80755aa76d83e25b997`) apunta a:

- `https://qskmzaxzhkrlchycbria.supabase.co/functions/v1/twilio-inbound`

Eso es para mensajes entrantes (Supabase Edge Function). La verificación OTP de registro usa solo la Verify API (envío y check), no ese webhook.
