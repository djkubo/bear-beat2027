/**
 * E2E – Catálogo + Descargas reales (requiere credenciales)
 *
 * Ejecutar contra producción:
 *   BASE_URL=https://bear-beat2027.onrender.com E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e -- tests/e2e/catalog-downloads.spec.ts
 *
 * Nota: NO hardcodear credenciales en el repo.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'
const EMAIL = process.env.E2E_EMAIL || process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_PASSWORD || process.env.E2E_TEST_PASSWORD

test.describe('Catalogo: login + demo + descargas', () => {
  test.skip(!EMAIL || !PASSWORD, 'Falta E2E_EMAIL/E2E_PASSWORD para pruebas reales de descargas.')

  test('Descarga ZIP y MP4 sin abrir nuevas pestañas', async ({ page, context }) => {
    test.setTimeout(4 * 60 * 1000)

    // 1) Login con redirect a /contenido
    await page.goto(`${BASE}/login?redirect=/contenido`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 20_000 })
    await page.locator('#login-email').fill(String(EMAIL))
    await page.locator('#login-password').fill(String(PASSWORD))

    await Promise.all([
      page.waitForURL(
        (url) => {
          try {
            return new URL(url).pathname === '/contenido'
          } catch {
            return false
          }
        },
        { timeout: 60_000 }
      ),
      page.getByRole('button', { name: /ENTRAR/i }).click(),
    ])

    // 2) Asegurar UI del catálogo visible
    await expect(page.getByPlaceholder(/Busca por artista/i)).toBeVisible({ timeout: 25_000 })

    // Expandir el primer género disponible.
    const firstGenreTile = page.locator('button:has-text("Explorar")').first()
    await expect(firstGenreTile).toBeVisible({ timeout: 25_000 })
    await firstGenreTile.click()

    const panel = page.locator('[role="region"][aria-label="Lista de videos"]')
    await expect(panel).toBeVisible({ timeout: 20_000 })

    // Seleccionar primer video (esto carga el sidebar con el CTA grande de descarga).
    const firstDemoBtn = page.getByRole('button', { name: 'Ver demo' }).first()
    await expect(firstDemoBtn).toBeVisible({ timeout: 25_000 })
    await firstDemoBtn.click()

    const downloadVideoCta = page.locator('aside').getByRole('button', { name: /DESCARGAR VIDEO/i })
    await expect(downloadVideoCta).toBeVisible({ timeout: 25_000 })

    // 3) Descargar MP4: debe iniciar descarga y NO abrir tab/ventana.
    let openedNewPage = false
    context.on('page', () => {
      openedNewPage = true
    })

    const mp4Download = await Promise.all([
      page.waitForEvent('download', { timeout: 90_000 }),
      downloadVideoCta.click(),
    ]).then(([d]) => d)

    expect(openedNewPage, 'La descarga no debe abrir nuevas pestañas/ventanas').toBe(false)
    expect(mp4Download.suggestedFilename().toLowerCase()).toMatch(/\.mp4$/)

    // 4) Descargar ZIP de la carpeta (si está disponible en esa vista).
    // El botón está en el header de la lista expandida.
    const zipBtn = page.getByRole('button', { name: /DESCARGAR CARPETA ZIP|ZIP/i }).first()
    await expect(zipBtn).toBeVisible({ timeout: 25_000 })

    openedNewPage = false
    const zipDownload = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      zipBtn.click(),
    ]).then(([d]) => d)

    expect(openedNewPage, 'La descarga ZIP no debe abrir nuevas pestañas/ventanas').toBe(false)
    expect(zipDownload.suggestedFilename().toLowerCase()).toMatch(/\.zip$/)
  })
})
