'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getMessengerUrl } from '@/config/contact'

// ==========================================
// PÁGINA DE ERROR - Cuando algo falla
// ==========================================

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log del error para debugging
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-bear-black text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <Image 
            src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
            alt="Bear Beat"
            width={80}
            height={80}
            className="mx-auto"
          />
        </div>

        {/* Icono de error */}
        <div className="text-6xl mb-4">😵</div>
        
        {/* Mensaje */}
        <h2 className="text-2xl font-bold mb-4">¡Algo salió mal!</h2>
        <p className="text-gray-400 mb-8">
          No te preocupes, no es tu culpa. Intenta de nuevo o vuelve al inicio.
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-bear-blue text-bear-black font-bold px-8 py-4 rounded-xl hover:bg-bear-blue/90"
          >
            Intentar de nuevo
          </button>
          <Link href="/">
            <button className="bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 w-full">
              Ir al Inicio
            </button>
          </Link>
        </div>

        {/* Soporte */}
        <p className="text-sm text-gray-500 mt-8">
          ¿El problema persiste?{' '}
          <a href={getMessengerUrl()} className="text-bear-blue hover:underline">
            Contáctanos
          </a>
        </p>
      </div>
    </div>
  )
}
