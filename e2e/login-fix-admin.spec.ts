/**
 * E2E: Login con test@bearbeat.com y acceso a /fix-admin
 *
 * Reproduce el flujo: login → redirect a /fix-admin → debe verse "Listo" (admin asignado).
 * Si la sesión no llega al servidor, se vería "Inicia sesión primero".
 *
 * Ejecutar: npm run test:e2e -- e2e/login-fix-admin.spec.ts
 * Contra producción: BASE_URL=https://bear-beat2027.onrender.com npm run test:e2e -- e2e/login-fix-admin.spec.ts
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'
const TEST_EMAIL = 'test@bearbeat.com'
const TEST_PASSWORD = 'Test123456!'

test.describe('Login + fix-admin', () => {
  test('login con test@bearbeat.com y redirect a /fix-admin debe asignar admin', async ({ page }) => {
    test.setTimeout(60000)

    // 1. Ir a login con redirect a fix-admin
    await page.goto(`${BASE_URL}/login?redirect=/fix-admin`, { waitUntil: 'networkidle' })

    // 2. Rellenar credenciales
    await page.getByPlaceholder(/tu@email\.com|email/i).fill(TEST_EMAIL)
    await page.getByPlaceholder(/contraseña|password/i).fill(TEST_PASSWORD)

    // 3. Enviar formulario
    await page.getByRole('button', { name: /entrar a mi cuenta/i }).click()

    // 4. Esperar a salir de login (redirige a /fix-admin o /dashboard)
    await page.waitForURL(/\/(fix-admin|dashboard)/, { timeout: 15000 })

    // 5. Si nos mandaron a fix-admin, la página debe mostrar éxito (no "Inicia sesión primero")
    if (page.url().includes('/fix-admin')) {
      await expect(page.getByText(/listo|rol admin asignado/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/inicia sesión primero/i)).not.toBeVisible()
    }

    // 6. Si hay enlace "Ir al panel admin", comprobar que /admin carga
    const linkAdmin = page.getByRole('link', { name: /ir al panel admin|panel admin/i })
    if (await linkAdmin.isVisible().catch(() => false)) {
      await linkAdmin.click()
      await page.waitForURL(/\/admin/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/admin/)
    }
  })
})
