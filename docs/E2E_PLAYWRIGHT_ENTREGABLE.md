# Entregable E2E – Playwright (Senior QA)

## Comando exacto para ver el navegador en modo fantasma

```bash
npm run test:e2e:headed
```

Para un solo archivo (por ejemplo smoke):

```bash
npm run test:e2e:headed -- tests/e2e/smoke.spec.ts
```

Para un solo test por nombre:

```bash
npm run test:e2e:headed -- -g "Home carga"
```

---

## Estructura creada

```
tests/
├── e2e/
│   ├── smoke.spec.ts         # Humo: Home, nav, sin 404 ni consola roja
│   ├── chatbot.spec.ts       # Chat: widget, mensaje, IA, historial (API + userId)
│   ├── checkout-push.spec.ts # Checkout + simulación éxito + /api/push/send 401
│   └── edge-cases.spec.ts    # Red lenta, 10 clics en botón
└── README.md
```

Configuración: `playwright.config.ts` (raíz), `testDir: './tests/e2e'`.

---

## Resumen de pruebas

| Suite | Qué cubre |
|-------|------------|
| **Smoke** | Home carga, H1 + CTA, consola sin errores; CTA → checkout; rutas críticas 200. |
| **Chatbot** | Abrir widget, enviar mensaje, respuesta IA; POST /api/chat con message y opcional userId; historial en UI. |
| **Checkout-Push** | Checkout muestra métodos de pago; elegir Tarjeta llama a create-checkout; mock de éxito redirige a complete-purchase; POST /api/push/send sin auth → 401. |
| **Edge** | Home carga con red lenta (delay en /api); 10 clics en CTA no rompen ni duplican navegación; 10 clics en Enviar chat → ≤3 requests. |

---

## Requisitos para ejecutar

1. **Instalar navegadores (una vez):** `npx playwright install`
2. Servidor en marcha: `npm run dev` (o Playwright lo levanta si no hay `BASE_URL`).
3. `.env.local` con Supabase y, para flujo real de chat, `OPENAI_API_KEY`.
4. Opcional: `BASE_URL=http://127.0.0.1:3000` si usas otro puerto.

---

## Fallos en lanzamiento

- **Smoke**: si alguna ruta devuelve 404 o hay error en consola (salvo ResizeObserver), el test falla.
- **Chatbot**: si la IA no responde en 25–30 s, aumentar timeout o usar mock de /api/chat en CI.
- **Checkout**: el test con mock no usa Stripe real; el de “elegir Tarjeta” solo comprueba que se llama a create-checkout.
- **Edge**: el test de 10 clics en Enviar asume que el botón se deshabilita o hay debounce; si el backend recibe más de 3 requests, relajar la aserción a ≤5.
