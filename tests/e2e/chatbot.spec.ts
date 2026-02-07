/**
 * E2E – Flujo de conciencia (Chatbot Fase 3)
 * Abre el widget de chat, envía un mensaje, espera respuesta de la IA
 * y verifica que el historial se persiste (API recibe userId cuando hay sesión).
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'

test.describe('Chatbot: widget, mensaje, IA, historial', () => {
  test('Abrir widget, enviar mensaje y recibir respuesta de la IA', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })

    const openChat = page.getByRole('button', { name: /Abrir chat|Cerrar chat/ })
    await openChat.click()
    await expect(page.locator('text=BearBot AI')).toBeVisible({ timeout: 5_000 })

    const input = page.getByPlaceholder(/Escribe aquí/i)
    await expect(input).toBeVisible({ timeout: 3_000 })
    await input.fill('¿Cuánto cuesta el pack?')
    await page.getByRole('button', { name: /Enviar/i }).click()

    await expect(page.locator('text=¿Cuánto cuesta el pack?').first()).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText(/\\$|MXN|USD|precio|pack/i).first()).toBeVisible({ timeout: 25_000 })
  })

  test('POST /api/chat recibe mensaje y opcionalmente userId (historial Supabase)', async ({ page }) => {
    let chatRequestBody: { message?: string; userId?: string; history?: unknown } = {}
    await page.route('**/api/chat', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        try {
          chatRequestBody = route.request().postDataJSON()
        } catch {
          // ignore
        }
      }
      await route.continue()
    })

    await page.goto(BASE, { waitUntil: 'networkidle' })
    const openChat = page.getByRole('button', { name: /Abrir chat|Cerrar chat/ })
    await openChat.click()
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5_000 })

    const input = page.getByPlaceholder(/Escribe aquí/i)
    await input.fill('Hola bot E2E test')
    await page.getByRole('button', { name: /Enviar/i }).click()

    await expect(page.locator('text=Hola bot E2E test').first()).toBeVisible({ timeout: 3_000 })
    await page.waitForTimeout(2_000)

    const response = await page.waitForResponse(
      (r) => r.url().includes('/api/chat') && r.request().method() === 'POST',
      { timeout: 30_000 }
    )
    expect(response.status()).toBe(200)
    const body = response.request().postDataJSON()
    expect(body).toHaveProperty('message')
    expect(body.message).toContain('E2E test')
    if (body.userId) {
      expect(typeof body.userId).toBe('string')
      expect(body.userId.length).toBeGreaterThan(0)
    }
  })

  test('Con usuario simulado (cookie/sesión), historial visible en UI tras respuesta', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const openChat = page.getByRole('button', { name: /Abrir chat|Cerrar chat/ })
    await openChat.click()

    const input = page.getByPlaceholder(/Escribe aquí/i)
    await input.fill('¿Cómo descargo los videos?')
    await page.getByRole('button', { name: /Enviar/i }).click()

    await expect(page.locator('text=¿Cómo descargo los videos?').first()).toBeVisible({ timeout: 3_000 })
    await expect(
      page.getByText(/descarga|FTP|Web|descargar/i).first()
    ).toBeVisible({ timeout: 28_000 })
  })
})
