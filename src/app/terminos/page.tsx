import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Términos de Servicio | Bear Beat',
  description: 'Términos y condiciones de uso de Bear Beat',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* Header */}
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
          <h1 className="text-4xl font-black mb-8">Términos de Servicio</h1>
          <p className="text-gray-400 mb-8">Última actualización: Enero 2026</p>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">1. Aceptación de los Términos</h2>
              <p className="text-gray-300">
                Al acceder y utilizar los servicios de Bear Beat, aceptas estos términos de servicio en su totalidad. 
                Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">2. Descripción del Servicio</h2>
              <p className="text-gray-300">
                Bear Beat proporciona acceso a packs de video remixes musicales diseñados para uso profesional de DJs. 
                El servicio incluye:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li>Descarga de video remixes en formato digital (HD/4K)</li>
                <li>Acceso a través de plataforma web y/o FTP</li>
                <li>Soporte técnico para descargas</li>
                <li>Actualizaciones del contenido según el plan adquirido</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">3. Licencia de Uso</h2>
              <p className="text-gray-300">
                Al adquirir un pack, obtienes una licencia personal e intransferible para:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li>Usar los videos en presentaciones públicas como DJ</li>
                <li>Almacenar los archivos en tus dispositivos personales</li>
                <li>Utilizar el contenido de manera indefinida</li>
              </ul>
              <p className="text-gray-300 mt-4">
                <strong>No está permitido:</strong> redistribuir, revender, compartir públicamente los archivos, 
                o utilizarlos para crear contenido derivado para venta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">4. Pagos y Facturación</h2>
              <p className="text-gray-300">
                Los pagos se procesan de forma segura a través de Stripe. Aceptamos:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li>Tarjetas de crédito y débito (Visa, Mastercard, American Express)</li>
                <li>Pago en efectivo en OXXO (solo México)</li>
                <li>Transferencia bancaria SPEI (solo México)</li>
              </ul>
              <p className="text-gray-300 mt-4">
                Los precios están expresados en Pesos Mexicanos (MXN) o Dólares (USD) según tu ubicación.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">5. Política de Reembolsos</h2>
              <p className="text-gray-300">
                Ofrecemos garantía de satisfacción de 30 días. Si no estás satisfecho con tu compra, 
                puedes solicitar un reembolso completo dentro de los primeros 30 días posteriores a la compra, 
                sin necesidad de dar explicaciones.
              </p>
              <p className="text-gray-300 mt-4">
                Para solicitar un reembolso, contacta a soporte@bearbeat.mx con tu email de compra.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">6. Privacidad</h2>
              <p className="text-gray-300">
                Tu privacidad es importante para nosotros. Consulta nuestra{' '}
                <Link href="/privacidad" className="text-bear-blue hover:underline">
                  Política de Privacidad
                </Link>{' '}
                para conocer cómo recopilamos, usamos y protegemos tu información personal.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">7. Modificaciones</h2>
              <p className="text-gray-300">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web. 
                Te recomendamos revisar periódicamente estos términos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">8. Contacto</h2>
              <p className="text-gray-300">
                Si tienes preguntas sobre estos términos, contáctanos:
              </p>
              <ul className="list-none text-gray-300 space-y-2 mt-4">
                <li>📧 Email: soporte@bearbeat.mx</li>
                <li>💬 WhatsApp: +52 (disponible en horario laboral)</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-bear-blue/20">
            <Link href="/" className="text-bear-blue hover:underline">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
