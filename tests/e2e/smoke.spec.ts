/**
 * E2E – Prueba de humo (Smoke Test)
 * Visita la Home, verifica que todos los botones de navegación funcionan,
 * que no hay 404 ni errores rojos en consola.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'

test.describe('Smoke: Home y navegación', () => {
  test('Home carga y muestra H1 + CTA principal', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      if (type === 'error' && !text.includes('ResizeObserver')) {
        consoleErrors.push(text)
      }
    })

    const res = await page.goto(BASE, { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 15_000 })
    await expect(h1).toContainText(/TU COMPETENCIA TE VA A ENVIDIAR|videos HD|Video Remixes|BEAR BEAT|Pack/i)

    const cta = page.getByRole('link', { name: /QUIERO ACCESO|Comprar|acceso|OBTENER/i })
      .or(page.getByRole('button', { name: /QUIERO ACCESO|Comprar|acceso/i }))
    await expect(cta.first()).toBeVisible({ timeout: 8_000 })

    expect(consoleErrors, `No debe haber errores de consola (se capturaron: ${consoleErrors.join('; ')})`).toHaveLength(0)
  })

  test('CTA principal lleva a checkout sin 404', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const cta = page.getByRole('link', { name: /QUIERO ACCESO|Comprar|acceso|OBTENER/i }).first()
    await expect(cta).toBeVisible({ timeout: 8_000 })
    await cta.click()
    await page.waitForURL(/\/checkout/, { timeout: 12_000 })
    const res = await page.goto(page.url(), { waitUntil: 'domcontentloaded' })
    expect(res?.status()).not.toBe(404)
  })

  test('Rutas críticas responden 200 sin errores de consola', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('ResizeObserver')) {
        consoleErrors.push(msg.text())
      }
    })

    const routes = ['/', '/contenido', '/checkout', '/login', '/register', '/terminos', '/privacidad', '/preview']
    for (const route of routes) {
      consoleErrors.length = 0
      const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
      expect(res?.status(), `GET ${route} debe ser 200`).toBe(200)
      expect(consoleErrors, `Consola en ${route} sin errores críticos`).toHaveLength(0)
    }
  })
})
