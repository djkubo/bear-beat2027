import { SMSWhatsAppClient } from './SMSWhatsAppClient'

export default function AdminSmsWhatsAppPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 bg-zinc-950/95">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <a
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-medium text-bear-blue hover:underline mb-4"
          >
            ← Volver al Panel
          </a>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bear-blue/20 text-2xl">
              📱
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                SMS y WhatsApp
              </h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                SMS por Brevo · WhatsApp por Twilio. Plantillas y envío de prueba.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <SMSWhatsAppClient />
      </div>
    </div>
  )
}
