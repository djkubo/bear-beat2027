import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtpOnceReady, getContentType } from '@/lib/ftp-stream'
import { unicodePathVariants } from '@/lib/unicode-path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const EXPIRY_VIDEO = 3600 // 1 h
const EXPIRY_ZIP = 10800 // 3 h (los ZIP tardan más en bajar)
const LEGACY_VIDEOS_FOLDER = 'Videos Enero 2026'
const BUNNY_PROBE_TIMEOUT_MS = 7000
const MAX_BUNNY_PROBES = 18 // Evita colgarse cuando el archivo no existe o el origin está lento

/** Nombre de archivo seguro para Content-Disposition (evita caracteres problemáticos). */
function safeDownloadFilename(name: string): string {
  const base = (name || 'download').replace(/[\x00-\x1f\x7f"\\<>|*?]/g, '').trim() || 'download'
  return base.length > 200 ? base.slice(0, 200) : base
}

function joinPaths(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => !!p && typeof p === 'string')
    .map((p) => p.replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
}

function removeDiacritics(input: string): string {
  try {
    return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
  } catch {
    return input
  }
}

function pathSearchVariants(input: string): string[] {
  const base = unicodePathVariants(input, 'input')
  const deaccented = removeDiacritics(input)
  const extra = deaccented !== input ? unicodePathVariants(deaccented, 'input') : []
  return Array.from(new Set([...base, ...extra].filter(Boolean)))
}

async function probeSignedUrl(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store',
      // Some Bunny configs don't behave well with HEAD. GET+Range is cheap and tends to trigger Pull Zone origin fetch.
      signal: AbortSignal.timeout(BUNNY_PROBE_TIMEOUT_MS),
    })
    const status = res.status
    try {
      await (res.body as any)?.cancel?.()
    } catch {
      // ignore
    }
    return { ok: res.ok, status }
  } catch {
    return { ok: false, status: 0 }
  }
}

/**
 * GET /api/download?file=Genre/video.mp4 | Banda.zip
 * Solo usuarios con compras activas.
 * Bunny: redirige (302) a URL firmada para que el navegador descargue desde el CDN (sin timeout).
 * FTP: stream del archivo con Content-Disposition: attachment.
 */
export async function GET(req: NextRequest) {
  try {
    const startedAt = Date.now()
    const filePath = req.nextUrl.searchParams.get('file')
    const debug = req.nextUrl.searchParams.get('debug') === '1'
    let debugInfo: any = null
    let bunnyFallbackUrl: string | null = null
    let bunnyFallbackPath: string | null = null

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    let { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) session = { user } as typeof session
    }
    const user = session?.user
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado. Inicia sesión.', loginUrl: '/login' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id, pack_id')
      .eq('user_id', user.id)

    if (error || !purchases || purchases.length === 0) {
      return NextResponse.json({
        error: 'No tienes acceso a las descargas. Compra el pack para descargar.',
        redirect: '/checkout'
      }, { status: 403 })
    }

    let sanitizedPath: string
    try {
      sanitizedPath = decodeURIComponent(filePath || '').replace(/\.\./g, '').replace(/^\//, '').trim()
    } catch {
      sanitizedPath = (filePath || '').replace(/\.\./g, '').replace(/^\//, '').trim()
    }
    sanitizedPath = sanitizedPath.replace(/^Videos Enero 2026\/?/i, '').trim() || sanitizedPath
    if (!sanitizedPath) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
    }

    const isZip = sanitizedPath.toLowerCase().endsWith('.zip')
    const streamInline = req.nextUrl.searchParams.get('stream') === 'true' && !isZip

    const filename = safeDownloadFilename(sanitizedPath.split('/').pop() || 'download')
    const contentType = getContentType(sanitizedPath)
    const disposition = streamInline
      ? 'inline'
      : `attachment; filename="${filename.replace(/"/g, '\\"')}"`

    // Intentar inferir el pack del usuario para probar prefijos típicos (packs/<slug>/...).
    let purchasedPackSlug: string | null = null
    try {
      const firstPackId = purchases?.[0]?.pack_id
      if (firstPackId) {
        const { data: packRow } = await supabase.from('packs').select('slug').eq('id', firstPackId).maybeSingle()
        purchasedPackSlug = packRow?.slug ? String(packRow.slug) : null
      }
    } catch {
      // ignore
    }

    // 1) Prioridad: Bunny CDN. Probar varias rutas típicas (con/sin prefijo, legacy y carpetas de zips).
    if (isBunnyConfigured()) {
      const expiresIn = isZip ? EXPIRY_ZIP : EXPIRY_VIDEO
      const pathUnicodeVariants = pathSearchVariants(sanitizedPath)

      const packPrefixCandidates = Array.from(
        new Set(
          [
            null,
            purchasedPackSlug ? `packs/${purchasedPackSlug}` : null,
            purchasedPackSlug ? purchasedPackSlug : null,
            purchasedPackSlug ? `packs/${purchasedPackSlug}/${LEGACY_VIDEOS_FOLDER}` : null,
            purchasedPackSlug ? `${purchasedPackSlug}/${LEGACY_VIDEOS_FOLDER}` : null,
          ].filter(Boolean)
        )
      )

      const zipFolderCandidates = isZip ? ['', '_ZIPS', 'zips', 'ZIPS'] : ['']

      // Orden heurístico:
      // - Video: primero con prefijo env (buildBunnyPath(usePrefix=true)), luego sin prefijo, luego legacy.
      // - ZIP: primero raíz y carpetas típicas (_ZIPS/), luego prefijos.
      const rawVariants = pathUnicodeVariants.flatMap((p) => {
        const baseZip = isZip && !p.includes('/') ? p : null
        const baseName = baseZip ? baseZip.replace(/\.zip$/i, '') : null

        const core: string[] = []
        if (isZip) {
          // ZIP puede estar en raíz o dentro de una carpeta (ej. _ZIPS/ o Genre/Genre.zip)
          core.push(buildBunnyPath(p, false), buildBunnyPath(p, true))
          for (const zf of zipFolderCandidates) {
            if (!zf) continue
            core.push(buildBunnyPath(joinPaths(zf, p), false), buildBunnyPath(joinPaths(zf, p), true))
          }
          if (baseZip && baseName) {
            core.push(buildBunnyPath(joinPaths(baseName, baseZip), false), buildBunnyPath(joinPaths(baseName, baseZip), true))
            for (const zf of zipFolderCandidates) {
              if (!zf) continue
              core.push(buildBunnyPath(joinPaths(zf, baseName, baseZip), false), buildBunnyPath(joinPaths(zf, baseName, baseZip), true))
            }
          }
        } else {
          core.push(buildBunnyPath(p, true), buildBunnyPath(p, false))
        }

        const legacyPath = `${LEGACY_VIDEOS_FOLDER}/${p}`.replace(/\/+/g, '/')
        core.push(buildBunnyPath(legacyPath, true), buildBunnyPath(legacyPath, false))

        // Prefijos alternativos típicos (packs/<slug>/...) por si el origin/CDN está organizado distinto.
        for (const pref of packPrefixCandidates) {
          core.push(buildBunnyPath(joinPaths(pref, p), false))
          core.push(buildBunnyPath(joinPaths(pref, legacyPath), false))
          if (isZip) {
            for (const zf of zipFolderCandidates) {
              if (!zf) continue
              core.push(buildBunnyPath(joinPaths(pref, zf, p), false))
              if (baseZip && baseName) core.push(buildBunnyPath(joinPaths(pref, zf, baseName, baseZip), false))
            }
          }
        }

        // Quitar vacíos y duplicados locales.
        return core.filter(Boolean)
      })
      const pathVariants = Array.from(new Set(rawVariants.filter(Boolean)))

      let signedUrl = ''
      let signedUrlPath = ''
      let signedUrlMaybe = ''
      let signedUrlMaybePath = ''
      const bunnyDebug: Array<{ path: string; status: number; ok: boolean; ms: number }> = []
      for (const bunnyPath of pathVariants) {
        if (bunnyDebug.length >= MAX_BUNNY_PROBES) break
        if (!bunnyPath) continue
        try {
          const url = generateSignedUrl(bunnyPath, expiresIn)
          const t0 = Date.now()
          const probe = await probeSignedUrl(url)
          bunnyDebug.push({ path: bunnyPath, status: probe.status, ok: probe.ok, ms: Date.now() - t0 })
          if (probe.ok) {
            signedUrl = url
            signedUrlPath = bunnyPath
            break
          }
          // No 404 => podría existir pero Bunny no respondió (timeout/origin lento) o rechazó el rango.
          // Guardamos el primer candidato "probable" para intentar usarlo aunque no podamos confirmar.
          if (!signedUrlMaybe && probe.status !== 404) {
            signedUrlMaybe = url
            signedUrlMaybePath = bunnyPath
          }
          // Si ni siquiera pudimos hacer el probe (status 0), no vale la pena seguir probando 50 variantes.
          if (probe.status === 0) break
        } catch {
          if (!signedUrlMaybe) {
            try {
              signedUrlMaybe = generateSignedUrl(bunnyPath, expiresIn)
              signedUrlMaybePath = bunnyPath
            } catch {
              // ignore
            }
          }
          continue
        }
      }

      if (signedUrl) {
        try {
          await supabase.from('downloads').insert({
            user_id: user.id,
            pack_id: purchases[0].pack_id,
            file_path: sanitizedPath,
            download_method: 'web',
          })
        } catch {
          // ignorar si la tabla no existe
        }

        // ZIP: redirigir a Bunny (evita 502 por timeout/memoria al hacer proxy de archivos grandes)
        if (isZip) return NextResponse.redirect(signedUrl, 302)

        // Video: proxy con Content-Disposition: attachment para forzar descarga (no abrir en pestaña)
        try {
          // No usamos timeout aquí: es un stream grande y el cliente puede tardar minutos descargando.
          const range = req.headers.get('range') || undefined
          const bunnyRes = await fetch(signedUrl, {
            cache: 'no-store',
            headers: range ? { Range: range } : undefined,
          })
          if (bunnyRes.ok && bunnyRes.body) {
            return new NextResponse(bunnyRes.body, {
              status: bunnyRes.status,
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': disposition,
                'X-Content-Type-Options': 'nosniff',
                ...(bunnyRes.headers.get('accept-ranges') && { 'Accept-Ranges': bunnyRes.headers.get('accept-ranges')! }),
                ...(bunnyRes.headers.get('content-range') && { 'Content-Range': bunnyRes.headers.get('content-range')! }),
                ...(bunnyRes.headers.get('content-length') && {
                  'Content-Length': bunnyRes.headers.get('content-length')!,
                }),
              },
            })
          }
          // Si falló el proxy, intentar FTP más abajo; si también falla, redirigir a Bunny como último recurso.
          console.warn('[download] Bunny proxy failed:', bunnyRes.status, 'path:', sanitizedPath)
          bunnyFallbackUrl = signedUrl
          bunnyFallbackPath = signedUrlPath || null
        } catch (proxyErr) {
          console.warn('[download] Proxy Bunny falló:', (proxyErr as Error)?.message || proxyErr, 'path:', sanitizedPath)
          bunnyFallbackUrl = signedUrl
          bunnyFallbackPath = signedUrlPath || null
        }
      } else if (signedUrlMaybe) {
        // No se pudo confirmar, pero guardamos un fallback a Bunny para último recurso.
        // (En algunos entornos el server no puede hacer probe/proxy, pero el cliente sí puede descargar desde el CDN).
        bunnyFallbackUrl = signedUrlMaybe
        bunnyFallbackPath = signedUrlMaybePath || null
        // Si no hay FTP, no hay nada más que intentar: redirect inmediato.
        if (!isFtpConfigured()) return NextResponse.redirect(signedUrlMaybe, 302)
      }

      // Adjuntar debug a req para el 503 final (sin exponer URLs firmadas).
      if (debug) {
        debugInfo = {
          tookMs: Date.now() - startedAt,
          bunny: {
            attempted: bunnyDebug,
            foundPath: signedUrlPath || null,
            maybePath: signedUrlMaybePath || null,
            fallbackPath: bunnyFallbackPath,
            attemptedCount: bunnyDebug.length,
            totalCandidates: pathVariants.length,
          },
        }
      }
    }

    // 2) Fallback: FTP (Hetzner)
    if (isFtpConfigured()) {
      const candidates: Array<{ path: string; type: 'video' | 'zip' | 'thumb' }> = []
      const pathBaseVariants = pathSearchVariants(sanitizedPath)

      if (isZip) {
        const baseZip = sanitizedPath && !sanitizedPath.includes('/') ? sanitizedPath : null
        const baseName = baseZip ? baseZip.replace(/\.zip$/i, '') : null
        const zipFolders = ['_ZIPS', 'zips', 'ZIPS']

        for (const p of pathBaseVariants) {
          candidates.push({ path: p, type: 'zip' })
          candidates.push({ path: p, type: 'video' }) // ZIPs a veces están dentro de FTP_BASE
          for (const zf of zipFolders) {
            candidates.push({ path: joinPaths(zf, p), type: 'zip' })
            candidates.push({ path: joinPaths(zf, p), type: 'video' })
          }
          if (baseZip && baseName) {
            candidates.push({ path: joinPaths(baseName, baseZip), type: 'zip' })
            candidates.push({ path: joinPaths(baseName, baseZip), type: 'video' })
            for (const zf of zipFolders) {
              candidates.push({ path: joinPaths(zf, baseName, baseZip), type: 'zip' })
              candidates.push({ path: joinPaths(zf, baseName, baseZip), type: 'video' })
            }
          }
        }
      } else {
        // Video normalmente vive dentro de FTP_BASE, pero intentamos también raíz (algunos setups).
        for (const p of pathBaseVariants) {
          candidates.push({ path: p, type: 'video' })
          candidates.push({ path: p, type: 'thumb' })
        }
      }

      let lastErr: unknown = null
      for (const c of candidates) {
        if (!c.path) continue
        try {
          const stream = await streamFileFromFtpOnceReady(c.path, c.type === 'thumb' ? 'thumb' : c.type)
          const webStream = Readable.toWeb(stream) as ReadableStream
          try {
            await supabase.from('downloads').insert({
              user_id: user.id,
              pack_id: purchases[0].pack_id,
              file_path: sanitizedPath,
              download_method: 'web',
            })
          } catch {
            // ignorar
          }
          return new NextResponse(webStream, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'private, max-age=3600',
              'Content-Disposition': disposition,
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (ftpErr) {
          lastErr = ftpErr
        }
      }
      console.warn('[download] FTP no tuvo el archivo:', (lastErr as Error)?.message || lastErr, 'path:', sanitizedPath)
    }

    const supportUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/contenido` : '/contenido'
    if (isFtpConfigured() || isBunnyConfigured()) {
      if (bunnyFallbackUrl) {
        return NextResponse.redirect(bunnyFallbackUrl, 302)
      }
      console.warn('[download] File not found in any source:', {
        path: sanitizedPath,
        isZip,
        ftp: isFtpConfigured(),
        bunny: isBunnyConfigured(),
        purchasedPackSlug,
      })
      return NextResponse.json(
        {
          error: 'La descarga no está disponible en este momento.',
          message: 'El archivo no se encontró en FTP (Hetzner) ni en Bunny. Intenta más tarde o descarga por FTP desde tu panel.',
          supportUrl,
          redirect: '/dashboard',
          path: sanitizedPath,
          pack: purchasedPackSlug,
          ...(debugInfo ? { debug: debugInfo } : {}),
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        error: 'Descargas no disponibles',
        reason: 'no_source',
        message: 'Configura FTP (Hetzner) o Bunny CDN (FTP_HOST, FTP_USER, FTP_PASSWORD o BUNNY_*) en Render.',
      },
      { status: 503 }
    )
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Download error:', err.message, err.stack)
    return NextResponse.json(
      {
        error: 'Error al descargar',
        message: err.message || 'Error interno. Revisa los logs en Render o descarga por FTP desde tu panel.',
      },
      { status: 500 }
    )
  }
}
