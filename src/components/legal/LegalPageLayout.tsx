import Image from 'next/image'
import Link from 'next/link'

/**
 * Layout compartido para páginas legales (términos, privacidad, reembolsos).
 * Dark mode premium: fondo zinc-950, tipografía legible, cyan para títulos.
 */
export function LegalPageLayout({
  title,
  lastUpdated,
  subtitle,
  titleCentered,
  children,
}: {
  title: string
  lastUpdated?: string
  /** Subtítulo en cyan (ej. "Sin preguntas, sin complicaciones."). */
  subtitle?: string
  /** Si es true, el título y la fecha se centran (ej. Política de Privacidad). */
  titleCentered?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white antialiased">
      <header className="border-b border-white/5 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-[#08E1F7]">BEAR BEAT</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-cyan-500 transition-colors"
          >
            ← Volver al Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-20">
        <header className={titleCentered ? 'text-center mb-10' : 'mb-10'}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-cyan-500 font-medium mb-2">
              {subtitle}
            </p>
          )}
          {lastUpdated && (
            <p className="text-sm text-zinc-500">
              Última actualización: {lastUpdated}
            </p>
          )}
        </header>

        <div className="legal-content space-y-10 [&_section]:space-y-4 [&_h2]:text-cyan-500 [&_h2]:font-bold [&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:first:mt-0 [&_h3]:text-cyan-500 [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-zinc-400 [&_p]:leading-relaxed [&_ul]:text-zinc-400 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:text-zinc-400 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_li]:text-zinc-400 [&_a]:text-cyan-500 [&_a]:no-underline hover:[&_a]:underline [&_strong]:text-zinc-300">
          {children}
        </div>

        <div className="mt-16 pt-8 border-t border-white/5">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-cyan-500 transition-colors"
          >
            ← Volver al Inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
