/**
 * E2E: Flujo de compra completo como Usuario Nuevo
 *
 * Requisitos: servidor en http://127.0.0.1:3000 y .env con Stripe en modo test
 * (STRIPE_SECRET_KEY sk_test_..., NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY pk_test_...).
 *
 * Pasos:
 * 1. Landing → H1 "1,000 videos HD..."
 * 2. Clic "QUIERO ACCESO AHORA"
 * 3. Checkout → Tarjeta → Stripe Hosted
 * 4. Rellenar tarjeta test 4242... y finalizar pago
 * 5. /complete-purchase → mensaje éxito, credenciales, botones
 * 6. Clic "Descargar por Web" → /contenido
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://127.0.0.1:3000'
const TEST_EMAIL = 'test_agent_2026@bearbeat.com'
const TEST_CARD = '4242424242424242'
const TEST_EXP = '1230' // MMYY
const TEST_CVC = '123'
const TEST_NAME = 'Agente de Prueba'

test.describe('Flujo de compra E2E - Usuario Nuevo', () => {
  test('compra completa: landing → checkout → Stripe → complete-purchase → contenido', async ({ page }) => {
    test.setTimeout(120_000)
    const results: string[] = []

    // ─── 1. LANDING ─────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 15000 })
    const h1Text = await h1.textContent()
    const landingOk = h1Text?.includes('1,000 videos HD') ?? false
    results.push(`1. LANDING: H1 visible = "${h1Text?.trim().slice(0, 50)}..." → ${landingOk ? 'OK' : 'FALLO'}`)
    expect(landingOk, 'H1 debe contener "1,000 videos HD"').toBe(true)

    // ─── 2. CLICK CTA ──────────────────────────────────────────────────
    const cta = page.getByRole('link', { name: /QUIERO ACCESO AHORA/i }).or(
      page.getByRole('button', { name: /QUIERO ACCESO AHORA/i })
    )
    await cta.first().click()
    await page.waitForURL(/\/checkout/, { timeout: 10000 })
    results.push(`2. CLICK: Redirigido a checkout → OK`)

    // ─── 3. CHECKOUT: elegir Tarjeta y ir a Stripe ─────────────────────
    const cardButton = page.getByRole('button', { name: /Tarjeta de Crédito\/Débito/i })
    await cardButton.click()
    // Esperar redirección a Stripe (checkout.stripe.com)
    await page.waitForURL(/checkout\.stripe\.com|stripe\.com/, { timeout: 25000 })
    results.push(`3. CHECKOUT: Redirigido a Stripe → OK`)

    // ─── 4. STRIPE: rellenar datos de pago ──────────────────────────────
    // Email (puede estar en la misma página o en un input)
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(TEST_EMAIL)
    }

    // Tarjeta: Stripe usa iframes (títulos "Secure card number input frame" en Elements; en Checkout hosted puede variar)
    try {
      const cardFrame = page.frameLocator('iframe[title*="card number" i]').first()
      await cardFrame.locator('input').first().fill(TEST_CARD, { timeout: 8000 })
    } catch {
      try {
        await page.frameLocator('iframe').first().locator('input').first().fill(TEST_CARD, { timeout: 5000 })
      } catch {
        results.push(`4. STRIPE: No se pudo rellenar tarjeta (revisar iframes)`)
      }
    }
    try {
      const expFrame = page.frameLocator('iframe[title*="expir" i]').first()
      await expFrame.locator('input').first().fill('12/30', { timeout: 5000 })
    } catch {
      await page.frameLocator('iframe').nth(1).locator('input').first().fill('12/30').catch(() => {})
    }
    try {
      const cvcFrame = page.frameLocator('iframe[title*="CVC" i]').first()
      await cvcFrame.locator('input').first().fill(TEST_CVC, { timeout: 5000 })
    } catch {
      await page.frameLocator('iframe').nth(2).locator('input').first().fill(TEST_CVC).catch(() => {})
    }

    // Nombre en la tarjeta (a veces en la página principal)
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input[placeholder*="Nombre" i]').first()
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(TEST_NAME)
    }

    // Botón de pagar / Submit en Stripe
    await page.getByRole('button', { name: /Pay|Pagar|Subscribe|Suscribir|Confirmar|Submit/i }).first().click({ timeout: 15000 })

    // ─── 5. POST-PAGO: esperar redirección a /complete-purchase ─────────
    await page.waitForURL(/\/complete-purchase\?session_id=/, { timeout: 60000 })
    results.push(`4. PAGO: Redirigido a complete-purchase → OK`)

    // Usuario nuevo: loading → success (2.5s) → form "Último paso: Crea tu acceso". Si no hay form, ya estamos en done.
    const formTitle = page.locator('text=Último paso: Crea tu acceso')
    await formTitle.waitFor({ state: 'visible', timeout: 35000 }).catch(() => {})

    if (await formTitle.isVisible().catch(() => false)) {
      await page.locator('input[type="email"]').fill(TEST_EMAIL)
      await page.locator('input[placeholder="Tu nombre"]').fill(TEST_NAME)
      await page.locator('input[type="tel"]').fill('+52 55 1234 5678').catch(() => {})
      await page.locator('input[placeholder*="Mínimo 6"]').fill('TestPass123!')
      await page.locator('input[placeholder*="Repite"]').fill('TestPass123!')
      await page.getByRole('button', { name: /ACTIVAR MI ACCESO/i }).click()
      await page.waitForSelector('text=¡Pago confirmado!', { timeout: 25000 })
    } else {
      await page.waitForSelector('text=¡Pago confirmado!', { timeout: 15000 }).catch(() => {})
    }

    const confirmadoText = await page.locator('h1').filter({ hasText: /Pago confirmado|acceso está listo/i }).textContent()
    const confirmadoOk = !!confirmadoText
    results.push(`5. POST-PAGO: Mensaje "¡Pago confirmado!" visible = ${confirmadoOk ? 'OK' : 'FALLO'}`)

    // Verificar credenciales (User/Pass o bloque "Guarda estos datos")
    const credsBlock = page.locator('text=Guarda estos datos, text=Tu cuenta, text=Email').first()
    const credsVisible = await credsBlock.isVisible().catch(() => false)
    results.push(`5b. Credenciales (User/Pass) visibles = ${credsVisible ? 'OK' : 'FALLO'}`)

    // Verificar botones "Descargar por Web" y "Datos FTP"
    const btnWeb = page.getByRole('link', { name: /Descargar por Web/i }).or(page.getByRole('button', { name: /Descargar por Web/i }))
    const btnFtp = page.getByRole('button', { name: /Datos FTP/i })
    const btnWebOk = await btnWeb.first().isVisible().catch(() => false)
    const btnFtpOk = await btnFtp.first().isVisible().catch(() => false)
    results.push(`5c. Botón "Descargar por Web" visible = ${btnWebOk ? 'OK' : 'FALLO'}`)
    results.push(`5d. Botón "Datos FTP" visible = ${btnFtpOk ? 'OK' : 'FALLO'}`)

    // ─── 6. ACCIÓN FINAL: clic "Descargar por Web" → /contenido ────────
    await btnWeb.first().click()
    await page.waitForURL(/\/contenido/, { timeout: 10000 })
    const onContenido = page.url().includes('/contenido')
    results.push(`6. ACCIÓN FINAL: Redirigido a /contenido sin login = ${onContenido ? 'OK' : 'FALLO'}`)

    // Reporte final
    console.log('\n========== REPORTE E2E COMPRA ==========')
    results.forEach((r) => console.log(r))
    console.log('=========================================\n')

    expect(onContenido, 'Debe estar en /contenido tras clic Descargar por Web').toBe(true)
  })

  test('pasos 1-3: Landing → CTA → Checkout → redirección a Stripe', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    const h1 = page.locator('h1').first()
    await expect(h1).toContainText('1,000 videos HD', { timeout: 15000 })
    await page.getByRole('link', { name: /QUIERO ACCESO AHORA/i }).first().click()
    await page.waitForURL(/\/checkout/, { timeout: 10000 })
    await page.getByRole('button', { name: /Tarjeta de Crédito\/Débito/i }).click()
    await page.waitForURL(/checkout\.stripe\.com|stripe\.com/, { timeout: 25000 })
    await expect(page).toHaveURL(/stripe\.com|checkout\.stripe\.com/)
  })
})
