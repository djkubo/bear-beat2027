import Link from 'next/link'
import Image from 'next/image'
import { getMessengerUrl } from '@/config/contact'

// ==========================================
// PÁGINA 404 - No encontrado
// ==========================================

export default function NotFound() {
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

        {/* 404 */}
        <h1 className="text-8xl font-black text-bear-blue mb-4">404</h1>
        
        {/* Mensaje */}
        <h2 className="text-2xl font-bold mb-4">¡Oops! Página no encontrada</h2>
        <p className="text-gray-400 mb-8">
          Parece que esta página se fue a poner música a otro lado. 🎧
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-bear-blue text-bear-black font-bold px-8 py-4 rounded-xl hover:bg-bear-blue/90 w-full sm:w-auto inline-flex items-center justify-center"
          >
            Ir al Inicio
          </Link>
          <Link
            href="/contenido"
            className="bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 w-full sm:w-auto inline-flex items-center justify-center"
          >
            Ver Videos
          </Link>
        </div>

        {/* Soporte */}
        <p className="text-sm text-gray-500 mt-8">
          ¿Necesitas ayuda?{' '}
          <a href={getMessengerUrl()} target="_blank" rel="noopener noreferrer" className="text-bear-blue hover:underline inline-flex items-center gap-1">
            <span aria-hidden>💬</span> Ayuda en línea
          </a>
        </p>
      </div>
    </div>
  )
}
