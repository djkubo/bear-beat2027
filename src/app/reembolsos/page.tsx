import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Política de Reembolsos | Bear Beat',
  description: 'Garantía de satisfacción de 30 días de Bear Beat',
}

export default function ReembolsosPage() {
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
          <h1 className="text-4xl font-black mb-8">Política de Reembolsos</h1>
          
          {/* Garantía destacada */}
          <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-8 mb-12 text-center">
            <div className="text-6xl mb-4">🛡️</div>
            <h2 className="text-3xl font-black text-green-400 mb-4">
              Garantía de Satisfacción de 30 Días
            </h2>
            <p className="text-xl text-gray-300">
              Si no estás 100% satisfecho con tu compra, te devolvemos tu dinero. 
              Sin preguntas, sin complicaciones.
            </p>
          </div>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">¿Cómo funciona?</h2>
              <p className="text-gray-300">
                En Bear Beat queremos que estés completamente satisfecho con tu compra. 
                Por eso ofrecemos una garantía de reembolso de 30 días sin preguntas.
              </p>
              <div className="bg-white/5 rounded-xl p-6 mt-4">
                <ol className="list-decimal list-inside text-gray-300 space-y-3">
                  <li>Tienes <strong>30 días</strong> desde tu fecha de compra para solicitar un reembolso</li>
                  <li>No necesitas dar ninguna explicación</li>
                  <li>El reembolso se procesa en <strong>5-10 días hábiles</strong></li>
                  <li>Recibes el <strong>100% de tu dinero</strong> de vuelta</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">¿Cómo solicitar un reembolso?</h2>
              <div className="bg-bear-blue/10 rounded-xl p-6 border border-bear-blue/30">
                <p className="text-gray-300 mb-4">
                  Envía un email a <strong className="text-bear-blue">soporte@bearbeat.mx</strong> con:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Asunto: "Solicitud de reembolso"</li>
                  <li>El email con el que realizaste la compra</li>
                  <li>Motivo del reembolso (opcional, nos ayuda a mejorar)</li>
                </ul>
                <p className="text-gray-300 mt-4">
                  ¡Y listo! Procesaremos tu reembolso en máximo 48 horas.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">¿Cuánto tarda en llegar mi reembolso?</h2>
              <p className="text-gray-300">
                El tiempo depende del método de pago original:
              </p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-bear-blue/30">
                      <th className="py-3 px-4">Método de Pago</th>
                      <th className="py-3 px-4">Tiempo de Reembolso</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-white/10">
                      <td className="py-3 px-4">💳 Tarjeta de Crédito/Débito</td>
                      <td className="py-3 px-4">5-10 días hábiles</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-3 px-4">🏪 OXXO</td>
                      <td className="py-3 px-4">Transferencia SPEI en 3-5 días</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-3 px-4">🏦 SPEI</td>
                      <td className="py-3 px-4">Transferencia SPEI en 3-5 días</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">Preguntas Frecuentes</h2>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-2">¿Puedo pedir reembolso si ya descargué los videos?</h3>
                  <p className="text-gray-400">
                    Sí. Nuestra garantía aplica aunque hayas descargado todo el contenido. 
                    Confiamos en que si pides un reembolso es porque realmente no quedaste satisfecho.
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-2">¿Qué pasa con mi cuenta después del reembolso?</h3>
                  <p className="text-gray-400">
                    Tu cuenta se desactiva y pierdes acceso al contenido. 
                    Puedes volver a comprar en el futuro si lo deseas.
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-2">¿Hay alguna condición para el reembolso?</h3>
                  <p className="text-gray-400">
                    La única condición es que la solicitud sea dentro de los primeros 30 días 
                    después de tu compra. No hay condiciones adicionales.
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-2">¿Puedo pedir reembolso parcial?</h3>
                  <p className="text-gray-400">
                    No ofrecemos reembolsos parciales. El reembolso es siempre por el 100% 
                    del monto pagado.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">Nuestro Compromiso</h2>
              <p className="text-gray-300">
                En Bear Beat llevamos más de 3 años sirviendo a DJs profesionales en México y LATAM. 
                Nuestra tasa de reembolso es menor al 1% porque nos esforzamos en entregar un 
                producto de calidad. Pero si por alguna razón no quedas satisfecho, respetamos tu 
                decisión y procesamos tu reembolso sin problemas.
              </p>
              <p className="text-gray-300 mt-4">
                Tu satisfacción es nuestra prioridad.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-bear-blue mb-4">Contacto</h2>
              <p className="text-gray-300">
                ¿Tienes dudas sobre reembolsos?
              </p>
              <ul className="list-none text-gray-300 space-y-2 mt-4">
                <li>📧 Email: soporte@bearbeat.mx</li>
                <li>💬 WhatsApp: +52 (disponible de Lun-Vie 9am-6pm)</li>
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
