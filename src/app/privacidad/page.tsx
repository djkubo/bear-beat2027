import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad | Bear Beat',
  description: 'Cómo Bear Beat recopila, usa y protege tu información personal',
}

export default function PrivacidadPage() {
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
          <h1 className="text-4xl font-black mb-8">Política de Privacidad</h1>
          <p className="text-gray-400 mb-8">Última actualización: Enero 2026</p>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">1. Información que Recopilamos</h2>
              <p className="text-gray-300">
                En Bear Beat recopilamos la siguiente información:
              </p>
              <h3 className="text-xl font-bold mt-4 mb-2">Información que nos proporcionas:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Nombre completo</li>
                <li>Dirección de correo electrónico</li>
                <li>Número de teléfono (para WhatsApp)</li>
                <li>Información de pago (procesada por Stripe)</li>
              </ul>
              <h3 className="text-xl font-bold mt-4 mb-2">Información recopilada automáticamente:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Dirección IP</li>
                <li>Tipo de navegador y dispositivo</li>
                <li>Páginas visitadas y acciones realizadas</li>
                <li>Fuente de tráfico (UTMs, referrers)</li>
                <li>Cookies y tecnologías similares</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">2. Cómo Usamos tu Información</h2>
              <p className="text-gray-300">
                Utilizamos tu información para:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li>Procesar tus compras y entregarte acceso al contenido</li>
                <li>Enviarte confirmaciones y notificaciones sobre tu cuenta</li>
                <li>Proporcionarte soporte técnico</li>
                <li>Mejorar nuestros productos y servicios</li>
                <li>Enviarte comunicaciones de marketing (si lo autorizas)</li>
                <li>Prevenir fraudes y actividades ilegales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">3. Compartición de Información</h2>
              <p className="text-gray-300">
                Compartimos tu información únicamente con:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li><strong>Stripe:</strong> Para procesar pagos de forma segura</li>
                <li><strong>Supabase:</strong> Para almacenar datos de forma segura</li>
                <li><strong>ManyChat:</strong> Para comunicaciones por WhatsApp/Messenger</li>
                <li><strong>Meta (Facebook):</strong> Para análisis y publicidad</li>
              </ul>
              <p className="text-gray-300 mt-4">
                No vendemos, alquilamos ni compartimos tu información personal con terceros para fines de marketing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">4. Cookies y Tecnologías de Seguimiento</h2>
              <p className="text-gray-300">
                Utilizamos cookies y tecnologías similares para:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li>Mantener tu sesión activa</li>
                <li>Recordar tus preferencias</li>
                <li>Analizar el uso del sitio</li>
                <li>Personalizar publicidad</li>
              </ul>
              <p className="text-gray-300 mt-4">
                Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">5. Seguridad de los Datos</h2>
              <p className="text-gray-300">
                Implementamos medidas de seguridad para proteger tu información:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li>Encriptación SSL/TLS en todas las conexiones</li>
                <li>Almacenamiento seguro con Supabase (encriptación en reposo)</li>
                <li>Procesamiento de pagos PCI-compliant con Stripe</li>
                <li>Acceso restringido a datos personales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">6. Tus Derechos</h2>
              <p className="text-gray-300">
                Tienes derecho a:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                <li>Acceder a tus datos personales</li>
                <li>Corregir datos inexactos</li>
                <li>Solicitar la eliminación de tus datos</li>
                <li>Oponerte al procesamiento de tus datos</li>
                <li>Retirar tu consentimiento en cualquier momento</li>
              </ul>
              <p className="text-gray-300 mt-4">
                Para ejercer estos derechos, contacta a soporte@bearbeat.mx
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">7. Retención de Datos</h2>
              <p className="text-gray-300">
                Conservamos tus datos personales mientras tu cuenta esté activa o según sea necesario para 
                proporcionarte servicios. Los datos de transacciones se conservan según los requisitos legales 
                y fiscales aplicables (generalmente 5 años).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">8. Menores de Edad</h2>
              <p className="text-gray-300">
                Nuestros servicios están dirigidos a personas mayores de 18 años. No recopilamos 
                intencionalmente información de menores de edad.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">9. Cambios a esta Política</h2>
              <p className="text-gray-300">
                Podemos actualizar esta política periódicamente. Te notificaremos sobre cambios significativos 
                a través de email o aviso en el sitio web.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">10. Contacto</h2>
              <p className="text-gray-300">
                Para preguntas sobre privacidad:
              </p>
              <ul className="list-none text-gray-300 space-y-2 mt-4">
                <li>📧 Email: soporte@bearbeat.mx</li>
                <li>🌐 Sitio web: bearbeat.mx</li>
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
