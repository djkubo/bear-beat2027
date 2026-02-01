import { NextResponse } from 'next/server'

/**
 * Expone la URL base del CDN Bunny (BUNNY_CDN_URL) para que el frontend
 * construya URLs de demo directas sin proxy. El cliente no tiene acceso
 * a variables sin NEXT_PUBLIC_, por eso se lee aquí.
 */
export async function GET() {
  const base =
    typeof process.env.BUNNY_CDN_URL === 'string' && process.env.BUNNY_CDN_URL
      ? process.env.BUNNY_CDN_URL.replace(/\/$/, '')
      : ''
  return NextResponse.json({ baseUrl: base })
}
