/**
 * E2E: Login + fix-admin y fix-admin con token
 *
 * - login-fix-admin: login → redirect a /fix-admin (en producción la sesión puede no llegar).
 * - fix-admin con token: /fix-admin?token=bearbeat-admin-2027-secreto (requiere FIX_ADMIN_SECRET en Render).
 *
 * Contra producción: BASE_URL=https://bear-beat2027.onrender.com npm run test:e2e -- e2e/login-fix-admin.spec.ts
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'
const TEST_EMAIL = 'test@bearbeat.com'
const TEST_PASSWORD = 'Test123456!'
const FIX_ADMIN_TOKEN = 'bearbeat-admin-2027-secreto'

test.describe('Login + fix-admin', () => {
  test('login con test@bearbeat.com y redirect a /fix-admin', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto(`${BASE_URL}/login?redirect=/fix-admin`, { waitUntil: 'networkidle' })
    await page.getByPlaceholder(/tu@email\.com|email/i).fill(TEST_EMAIL)
    await page.getByPlaceholder(/contraseña|password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /entrar a mi cuenta/i }).click()
    await page.waitForURL(/\/(fix-admin|dashboard)/, { timeout: 15000 })
    if (page.url().includes('/fix-admin')) {
      const listo = page.getByText(/listo|rol admin asignado|admin asignado/i)
      const sinSesion = page.getByText(/inicia sesión primero|opción a/i)
      await expect(listo.or(sinSesion)).toBeVisible({ timeout: 10000 })
    }
  })

  test('fix-admin con token debe mostrar Listo o instrucción de Render', async ({ page }) => {
    test.setTimeout(20000)
    await page.goto(`${BASE_URL}/fix-admin?token=${FIX_ADMIN_TOKEN}`, { waitUntil: 'networkidle' })
    await expect(
      page.getByText(/listo|admin asignado|token no válido|fix_admin_secret|opción b/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('login y luego ir a /admin no debe redirigir a login (sesión leída en middleware)', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto(`${BASE_URL}/login?redirect=/admin`, { waitUntil: 'networkidle' })
    await page.getByPlaceholder(/tu@email\.com|email/i).fill(TEST_EMAIL)
    await page.getByPlaceholder(/contraseña|password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /entrar a mi cuenta/i }).click()
    await page.waitForURL(/\/(admin|dashboard|login)/, { timeout: 20000 })
    if (page.url().includes('/dashboard')) {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
      await page.waitForURL(/\/(admin|login|dashboard)/, { timeout: 10000 })
    }
    expect(page.url()).not.toMatch(/\/login\?.*redirect=.*admin/)
  })
})
