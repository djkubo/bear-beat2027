import Link from 'next/link'
import Image from 'next/image'

/** Header del panel admin alineado con la marca Bear Beat (mismo estilo que navbar del sitio). */
export function AdminHeader({ userEmail, showBackToDashboard = false }: { userEmail?: string | null; showBackToDashboard?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackToDashboard && (
            <Link href="/admin" className="text-zinc-400 hover:text-bear-blue text-sm font-medium transition">
              ← Panel
            </Link>
          )}
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={32}
              height={32}
            />
            <span className="text-lg font-black tracking-tight text-white">
              BEAR<span className="text-bear-blue">BEAT</span>
            </span>
            <span className="text-xs font-medium text-zinc-500 hidden sm:inline">Admin</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-xs text-zinc-500 truncate max-w-[160px] md:max-w-none" title={userEmail}>
              {userEmail}
            </span>
          )}
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-bear-blue text-black hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(8,225,247,0.2)]"
          >
            Ver como Cliente
          </Link>
        </div>
      </div>
    </header>
  )
}
