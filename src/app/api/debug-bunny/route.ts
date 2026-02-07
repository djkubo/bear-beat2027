import { NextRequest, NextResponse } from 'next/server'
import {
  getBunnyConfigStatus,
  buildBunnyPath,
  generateSignedUrl,
  isBunnyConfigured,
  getBunnyPackPrefix,
} from '@/lib/bunny'

/**
 * GET /api/debug-bunny?path=Genre/video.mp4
 * Diagnóstico: estado de Bunny, path construido, URL de prueba y prueba real (HEAD) a Bunny.
 * No expone secretos. Útil cuando demos/portadas/descargas dan 404.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // En producción este endpoint puede generar URLs firmadas: protégelo con un secreto.
  if (process.env.NODE_ENV === 'production') {
    const secret = (process.env.DEBUG_BUNNY_SECRET || '').trim()
    const token =
      (req.headers.get('x-debug-secret') || req.nextUrl.searchParams.get('token') || '').trim()
    if (!secret || token !== secret) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const pathParam = req.nextUrl.searchParams.get('path') || 'Bachata/Test.mp4'
  const pathNorm = pathParam.replace(/^\/+/, '').replace(/^Videos Enero 2026\/?/i, '').trim() || pathParam

  const status = getBunnyConfigStatus()
  const prefix = getBunnyPackPrefix()
  const builtPath = buildBunnyPath(pathNorm, true)
  const testSignedUrl = isBunnyConfigured() && builtPath ? generateSignedUrl(builtPath, 300) : null

  let bunnyResponseStatus: number | null = null
  let bunnyResponseError: string | null = null
  if (testSignedUrl) {
    try {
      const res = await fetch(testSignedUrl, { method: 'HEAD', redirect: 'follow' })
      bunnyResponseStatus = res.status
    } catch (e) {
      bunnyResponseError = (e as Error)?.message || String(e)
    }
  }

  const diagnosis = {
    configOk: status.ok,
    missing: status.missing,
    invalid: status.invalid,
    hints: status.hints,
    pathRequested: pathParam,
    pathNormalized: pathNorm,
    bunnyPathBuilt: builtPath || '(vacío)',
    prefixUsed: prefix || '(vacío – archivos en raíz)',
    testSignedUrl: testSignedUrl || null,
    bunnyResponseStatus,
    bunnyResponseError,
    whatItMeans: bunnyResponseStatus !== null
      ? bunnyResponseStatus === 200
        ? 'Bunny tiene el archivo en esa ruta. Si en la web no se ve, revisa CORS o el reproductor.'
        : bunnyResponseStatus === 403
          ? '403: Token/key incorrecta o Token Authentication mal configurada en la Pull Zone.'
          : bunnyResponseStatus === 404
            ? '404: El archivo NO existe en Bunny Storage (o en el origen de la Pull Zone) en la ruta indicada. Sube los archivos a esa ruta o ajusta BUNNY_PACK_PATH_PREFIX.'
            : `HTTP ${bunnyResponseStatus}: Revisa la Pull Zone y el origen (Storage Zone o custom).`
      : bunnyResponseError
        ? `Error al conectar: ${bunnyResponseError}`
        : null,
    checklist: [
      'Render → Environment: BUNNY_CDN_URL, BUNNY_TOKEN_KEY, BUNNY_PACK_PATH_PREFIX (sin comillas).',
      'Bunny → Pull Zone → Security: Token Authentication activada, clave = BUNNY_TOKEN_KEY.',
      'Bunny Storage (o el origen de la Pull Zone): la carpeta debe existir y contener los archivos en la ruta exacta que muestra bunnyPathBuilt.',
      'Si todo da 404: los archivos no están en Bunny. Súbelos con la estructura Videos Enero 2026/Genre/archivo.mp4 o cambia BUNNY_PACK_PATH_PREFIX a la carpeta real.',
    ],
  }

  return NextResponse.json(diagnosis)
}
