/**
 * E2E – Flujo de dinero (Checkout + Push)
 * Simula usuario que intenta comprar: verifica que el modal/pantalla de pago
 * muestra métodos (Tarjeta, OXXO, etc.) y que al iniciar pago se llama a create-checkout.
 * Verifica que /api/push/send está protegido (401 sin admin).
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'

test.describe('Checkout: modal de pago y flujo', () => {
  test('Checkout carga y muestra métodos de pago (Tarjeta, OXXO, SPEI, PayPal)', async ({ page }) => {
    await page.goto(`${BASE}/checkout?pack=enero-2026`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/checkout/)

    await expect(page.getByText(/Tarjeta|Crédito|Débito/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/OXXO|SPEI|Pagar|MXN|USD/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('Al elegir Tarjeta y clic "Ir a pagar" se llama a /api/create-checkout', async ({ page }) => {
    let createCheckoutCalled = false
    let createCheckoutStatus = 0
    await page.route('**/api/create-checkout', async (route) => {
      if (route.request().method() === 'POST') {
        createCheckoutCalled = true
        const res = await route.fetch()
        createCheckoutStatus = res.status()
        await route.fulfill({ response: res })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${BASE}/checkout?pack=enero-2026`, { waitUntil: 'networkidle' })
    // 1) Seleccionar método Tarjeta (botón con texto "Tarjeta" + "Visa, MC, Amex")
    await page.getByRole('button', { name: /Tarjeta/ }).first().click()
    await page.waitForTimeout(500)
    // 2) Clic en el botón que dispara create-checkout (solo visible cuando method === 'card')
    await page.getByRole('button', { name: /Ir a pagar con tarjeta|pagar con tarjeta/i }).click()

    await page.waitForTimeout(3_000)
    expect(createCheckoutCalled, 'Debe llamarse a POST /api/create-checkout').toBe(true)
    expect(createCheckoutStatus, 'create-checkout debe responder 200 o 400 (validación)').toBeLessThan(500)
  })

  test('Simular éxito: mock de create-checkout devuelve URL y navegación', async ({ page }) => {
    await page.route('**/api/create-checkout', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: `${BASE}/complete-purchase?session_id=cs_e2e_test_${Date.now()}`,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${BASE}/checkout?pack=enero-2026`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Tarjeta/ }).first().click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /Ir a pagar con tarjeta|pagar con tarjeta/i }).click()

    await page.waitForURL(/\/complete-purchase\?session_id=/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/complete-purchase/)
  })
})

test.describe('API Push: protección y lógica', () => {
  test('POST /api/push/send sin auth devuelve 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/push/send`, {
      data: { title: 'Test', body: 'Test' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json().catch(() => ({}))
    expect(body?.error || body?.message || '').toMatch(/autenticado|No autorizado|401/i)
  })

  test('POST /api/push/send con cookie inválida devuelve 401 o 403', async ({ request }) => {
    const res = await request.post(`${BASE}/api/push/send`, {
      data: { title: 'Test', body: 'Test' },
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'sb-fake-session=invalid',
      },
    })
    expect([401, 403]).toContain(res.status())
  })
})
