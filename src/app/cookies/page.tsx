import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Cookies | Bear Beat',
  description: 'Uso de cookies en Bear Beat',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-bear-black text-white">
      <header className="py-4 px-4 border-b border-bear-blue/20">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
        </div>
      </header>

      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-8">Uso de Cookies</h1>
          <p className="text-gray-400 mb-8">Última actualización: Enero 2026</p>

          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            <p className="text-gray-300">
              Bear Beat utiliza cookies y tecnologías similares para sesión, preferencias y análisis.
              Los detalles completos están en nuestra Política de Privacidad.
            </p>
            <p className="text-gray-300">
              <Link href="/privacidad" className="text-bear-blue hover:underline">
                Ver Política de Privacidad →
              </Link>
            </p>
          </div>

          <div className="mt-12">
            <Link href="/" className="text-bear-blue hover:underline">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
