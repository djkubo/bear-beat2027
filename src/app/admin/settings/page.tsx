export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
      <a href="/admin" className="text-sm text-bear-blue hover:underline mb-4 inline-block font-medium">
        ← Volver al Panel
      </a>
      <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">⚙️ Configuración</h1>
      <p className="text-zinc-500 mb-6">
        La configuración se gestiona con variables de entorno en Render y en <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">.env.local</code> en desarrollo.
      </p>
      <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 space-y-4">
        <p className="text-sm text-zinc-300">
          Para cambiar URLs, claves de API (Stripe, Supabase, Resend, ManyChat, etc.), ve a tu servicio en Render → Environment y edita las variables. No hay panel de configuración en la base de datos por ahora.
        </p>
        <p className="text-sm text-zinc-500">
          Documentación: <code className="text-zinc-400">RENDER_DEPLOY.md</code>, <code className="text-zinc-400">INSTALACION.md</code>.
        </p>
      </div>
    </div>
  )
}
