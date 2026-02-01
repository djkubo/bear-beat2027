import Link from 'next/link'

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5 p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-4 block">
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-extrabold mb-2">⚙️ Configuración</h1>
        <p className="text-muted-foreground mb-6">
          La configuración de la app se gestiona mediante variables de entorno en Render y en <code className="bg-muted px-1 rounded">.env.local</code> en desarrollo.
        </p>
        <div className="bg-card rounded-xl p-6 border-2 border-bear-blue/20 space-y-4">
          <p className="text-sm">
            Para cambiar URLs, claves de API (Stripe, Supabase, Resend, ManyChat, etc.), ve a tu servicio en Render → Environment y edita las variables. No hay panel de configuración en la base de datos por ahora.
          </p>
          <p className="text-sm text-muted-foreground">
            Documentación: <code>RENDER_DEPLOY.md</code>, <code>INSTALACION.md</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
