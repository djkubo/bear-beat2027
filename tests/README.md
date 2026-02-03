# Tests E2E – Bear Beat

Estructura profesional de pruebas End-to-End con Playwright.

## Estructura

```
tests/
├── e2e/                    # Especificaciones E2E
│   ├── smoke.spec.ts       # Prueba de humo: Home, nav, sin 404 ni consola roja
│   ├── chatbot.spec.ts     # Flujo chatbot: widget, mensaje, IA, historial
│   ├── checkout-push.spec.ts  # Checkout + verificación API Push
│   └── edge-cases.spec.ts  # Modo destructor: red lenta, 10 clics
├── fixtures/               # (opcional) Datos y helpers
└── README.md               # Este archivo
```

## Requisitos

- Node 18+
- **Una sola vez:** `npx playwright install` (descarga Chromium, Firefox, etc.)
- App corriendo en `http://127.0.0.1:3000` (o `BASE_URL`); si no, Playwright la levanta con `npm run dev`
- `.env.local` con Supabase y, para flujo completo, Stripe test keys

## Comandos

**Importante:** ejecuta todo desde la raíz del proyecto (donde está `package.json`).

```bash
cd "/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0"
npx playwright install   # una vez: descarga Chromium/Firefox/WebKit del proyecto
npm run test:e2e:headed  # ver el navegador en modo fantasma
```

| Comando | Descripción |
|--------|-------------|
| `npm run test:e2e` | Ejecuta todos los E2E (headless) |
| **`npm run test:e2e:headed`** | **Ejecuta E2E con navegador visible (modo fantasma)** |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts` | Solo smoke |
| `npm run test:e2e:headed -- tests/e2e/chatbot.spec.ts` | Solo chatbot, headed |

## Variables de entorno (opcional)

- `BASE_URL`: URL de la app (default `http://127.0.0.1:3000`)
- `CI`: si está definido, no reutiliza servidor y hace retries
- `E2E_CHAT_USER_EMAIL` / `E2E_CHAT_USER_PASSWORD`: para tests de chat con usuario (historial Supabase)
