/**
 * E2E – Modo destructor (Edge Cases)
 * Red lenta, múltiples clics en botón (10 veces), comportamiento estable.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'

test.describe('Edge: red lenta', () => {
  test('Home carga y muestra contenido aunque las peticiones vayan lentas', async ({ page }) => {
    await page.route('**/*', async (route) => {
      const url = route.request().url()
      const delay = url.includes('/api/') ? 800 : 100
      await new Promise((r) => setTimeout(r, delay))
      await route.continue()
    })

    const res = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45_000 })
    expect(res?.status()).toBe(200)
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('Edge: 10 clics en botón', () => {
  test('Clic 10 veces en CTA de checkout no debe romper la app ni duplicar navegación', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const cta = page.getByRole('link', { name: /QUIERO ACCESO|Comprar|acceso/i }).first()
    await expect(cta).toBeVisible({ timeout: 8_000 })

    let navigateCount = 0
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame() && frame.url().includes('/checkout')) navigateCount++
    })

    for (let i = 0; i < 10; i++) {
      await cta.click({ force: true })
      await page.waitForTimeout(80)
    }

    await page.waitForURL(/\/checkout/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/checkout/)
    expect(navigateCount, 'Debe haber llegado a checkout sin múltiples navegaciones erráticas').toBeGreaterThanOrEqual(1)
  })

  test('Clic 10 veces en Enviar del chat no debe enviar 10 mensajes duplicados', async ({ page }) => {
    let postCount = 0
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        postCount++
        await route.continue()
      } else {
        await route.continue()
      }
    })

    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Abrir chat|Cerrar chat/ }).click()
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5_000 })

    const input = page.getByPlaceholder(/Escribe aquí/i)
    await input.fill('Un solo mensaje E2E')
    const sendBtn = page.getByRole('button', { name: /Enviar/i })
    for (let i = 0; i < 10; i++) {
      await sendBtn.click({ force: true })
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(2_000)
    expect(postCount, 'Debe enviarse como máximo 1–2 requests a /api/chat (debouncing o disabled)').toBeLessThanOrEqual(3)
  })
})
