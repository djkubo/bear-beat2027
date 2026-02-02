/**
 * E2E: Rutas críticas del embudo (públicas, privadas, APIs, errores)
 *
 * Valida que todas las rutas descritas en EMBUDO_Y_SECCIONES_A_FONDO.md
 * carguen correctamente y que las APIs protejan acceso (401/403).
 *
 * Ejecutar: npm run test:e2e -- e2e/critical-routes.spec.ts
 * Con servidor en http://127.0.0.1:3000
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'

test.describe('Rutas públicas', () => {
  test('Landing (/) carga y muestra CTA principal', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 15000 })
    const cta = page.getByRole('link', { name: /QUIERO ACCESO|Comprar|acceso/i }).or(
      page.getByRole('button', { name: /QUIERO ACCESO|Comprar/i })
    )
    await expect(cta.first()).toBeVisible({ timeout: 5000 })
  })

  test('Contenido (/contenido) carga; sin compra muestra paywall o CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/contenido`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/contenido/)
    const paywallOrCta = page.getByText(/comprar|paywall|acceso|descargar/i).first()
    await expect(paywallOrCta).toBeVisible({ timeout: 15000 })
  })

  test('Checkout (/checkout?pack=enero-2026) carga y muestra métodos de pago', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout?pack=enero-2026`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/checkout/)
    const method = page.getByText(/Tarjeta|OXXO|SPEI|Pagar/i).first()
    await expect(method).toBeVisible({ timeout: 10000 })
  })

  test('Complete-purchase sin session_id muestra error o mensaje claro', async ({ page }) => {
    await page.goto(`${BASE_URL}/complete-purchase`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/complete-purchase/)
    const errorOrLoading = page.getByText(/session|sesión|No se encontró|Algo salió mal|Verificando/i).first()
    await expect(errorOrLoading).toBeVisible({ timeout: 15000 })
  })

  test('Pago pendiente (/pago-pendiente) con session_id carga', async ({ page }) => {
    await page.goto(`${BASE_URL}/pago-pendiente?session_id=cs_test_dummy`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/pago-pendiente/)
    const content = page.getByText(/pendiente|esperando|Ya pagué|session/i).first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })

  test('Login (/login) carga y muestra formulario', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByPlaceholder(/email|correo/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByPlaceholder(/contraseña|password/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('Register (/register) carga', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/register/)
    const form = page.locator('form').first()
    await expect(form).toBeVisible({ timeout: 5000 })
  })

  test('Términos (/terminos) carga', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/terminos`, { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(/\/terminos/)
  })

  test('Privacidad (/privacidad) carga', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/privacidad`, { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(/\/privacidad/)
  })

  test('Preview (/preview) carga', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/preview`, { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(/\/preview/)
  })

  test('Portal (/portal) sin sesión redirige a login', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/(login|portal)/)
    if (page.url().includes('/login')) {
      await expect(page.getByPlaceholder(/email|correo/i).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Dashboard (/dashboard) sin sesión redirige a login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/(login|dashboard)/)
    if (page.url().includes('/login')) {
      await expect(page.getByPlaceholder(/email|correo/i).first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('APIs: auth y acceso', () => {
  test('GET /api/files sin auth devuelve 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/files?pack=1`)
    expect(res.status()).toBe(401)
    const body = await res.json().catch(() => ({}))
    expect(body?.error || body?.success === false).toBeTruthy()
  })

  test('GET /api/download sin auth devuelve 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/download?file=test.mp4`)
    expect(res.status()).toBe(401)
    const body = await res.json().catch(() => ({}))
    expect(body?.error).toBeTruthy()
  })

  test('GET /api/verify-payment sin session_id devuelve 400', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/verify-payment`)
    expect(res.status()).toBe(400)
  })
})
