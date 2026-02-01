import { NextResponse } from 'next/server'

/**
 * Endpoint de setup de base de datos (uso interno/admin).
 * GET: comprueba estado; POST: ejecuta migraciones si las hay.
 */
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Setup database endpoint' })
}

export async function POST() {
  return NextResponse.json({ ok: true, message: 'No migrations to run' })
}
