# Brevo – SMS y SMTP en Bear Beat

## SMS

La app envía SMS transaccionales (códigos OTP, bienvenida, etc.) usando **Brevo** como proveedor principal y Twilio como respaldo.

---

## Qué usar en el panel de Brevo

En **Brevo → Transaccional → SMS → Configuración** verás:

1. **Configuración de la API** con un ejemplo en PHP que usa una clave tipo `tEwhZ8bd0mfWRX1S` y la librería antigua (Mailin).
2. **Tu clave real** para la API actual: en la misma sección suele aparecer **“Clave API”** o **“API Key”** con formato **`xkeysib-...`** (más larga).

**Para esta app** debes usar la **Clave API** con formato `xkeysib-...`, no la del ejemplo PHP. Esa clave va en `.env.local` como **`BREVO_API_KEY`**.

Si solo ves el ejemplo PHP:
- Entra en **Configuración de la cuenta** (engranaje) → **API Keys** o **SMTP & API** y genera/copia la clave tipo `xkeysib-...`.
- Esa misma clave sirve para la API v3 de SMS (`POST /v3/transactionalSMS/send`), que es la que usa la app.

---

## Variables de entorno

| Variable | Uso |
|--------|-----|
| **BREVO_API_KEY** | Clave API (formato `xkeysib-...`). Obligatoria para enviar SMS con Brevo. |
| **BREVO_SMS_SENDER** | Nombre del remitente en el SMS (máx. 11 caracteres). Ej: `BearBeat`. Opcional; por defecto "BearBeat". |
| **BREVO_SMS_WEBHOOK_URL** | (Opcional) URL de callback para que Brevo notifique estado de envío/entrega. |

---

## Cómo funciona en la app

- **`/api/send-sms`**: si `BREVO_API_KEY` está definida, primero intenta enviar por Brevo; si falla o no está configurada, usa Twilio.
- Los códigos OTP del registro (cuando no usas Twilio Verify) pasan por `/api/send-sms`, así que pueden salir por Brevo.
- En Brevo → **SMS → Estadísticas / Logs** puedes ver envíos y entregas.

---

## Verificación en Brevo

Paso 2 del panel (“Verificación”): si Brevo pide verificar el remitente o el número, sigue los pasos que indiquen. La API solo enviará cuando la configuración y la verificación estén completas.

---

## Resumen

- **Panel Brevo**: el ejemplo PHP es la API antigua; ignóralo para esta integración.
- **Clave**: usa la **Clave API** `xkeysib-...` en **BREVO_API_KEY**.
- **Remitente**: opcional **BREVO_SMS_SENDER** (máx. 11 caracteres).
- Con eso, los SMS transaccionales de la app salen por Brevo y puedes seguirlos en Estadísticas/Logs.

---

## SMTP (emails)

Brevo también ofrece **clave SMTP** (formato `xsmtpsib-...`). Se genera **una sola vez**; guárdala en un lugar seguro porque Brevo no la vuelve a mostrar.

- **Variable:** `BREVO_SMTP_KEY` (ya guardada en `.env.local` si la generaste).
- **Uso:** Para enviar **emails** por SMTP (no para SMS). Por ejemplo:
  - **Supabase Auth** → Project Settings → Auth → SMTP: configurar servidor Brevo (smtp-relay.brevo.com, puerto 587) y usar esta clave como contraseña.
  - Si en el futuro quieres sustituir Resend por Brevo para correos transaccionales, esta clave se usaría en el cliente SMTP.
- La app actualmente usa **Resend** para correos; la clave SMTP de Brevo queda guardada por si quieres usar Brevo para emails más adelante.
