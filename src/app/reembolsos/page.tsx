import { LegalPageLayout } from '@/components/legal/LegalPageLayout'

export const metadata = {
  title: 'Política de Reembolsos | Bear Beat',
  description: 'Garantía de satisfacción de 30 días de Bear Beat',
}

export default function ReembolsosPage() {
  return (
    <LegalPageLayout
      title="Garantía de Satisfacción de 30 Días"
      subtitle="Sin preguntas, sin complicaciones."
      lastUpdated="Enero 2026"
      titleCentered
    >
      <section>
        <h2>¿Cómo funciona?</h2>
        <p>
          En Bear Beat queremos que estés completamente satisfecho con tu compra.
          Por eso ofrecemos una garantía de reembolso de 30 días sin preguntas.
        </p>
        <ol>
          <li>Tienes <strong>30 días</strong> desde tu fecha de compra para solicitar un reembolso</li>
          <li>No necesitas dar ninguna explicación</li>
          <li>El reembolso se procesa en <strong>5-10 días hábiles</strong></li>
          <li>Recibes el <strong>100% de tu dinero</strong> de vuelta</li>
        </ol>
      </section>

      <section>
        <h2>¿Cómo solicitar un reembolso?</h2>
        <ol className="list-decimal pl-6 space-y-3 text-zinc-400">
          <li>Ubica el botón de chat en la esquina inferior derecha de la pantalla.</li>
          <li>Inicia una conversación y selecciona la opción <strong className="text-white">Ayuda / Reembolsos</strong>.</li>
          <li>Nuestro sistema procesará tu solicitud automáticamente.</li>
        </ol>
      </section>

      <section>
        <h2>¿Cuánto tarda en llegar mi reembolso?</h2>
        <p>El tiempo depende del método de pago original:</p>
        <div className="overflow-x-auto my-4 rounded-xl border border-zinc-800">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="py-3 px-4 font-semibold text-cyan-500">Método de Pago</th>
                <th className="py-3 px-4 font-semibold text-cyan-500">Tiempo de Reembolso</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-800 bg-zinc-900/30">
                <td className="py-3 px-4 font-medium text-white">Tarjeta de Crédito/Débito</td>
                <td className="py-3 px-4 text-zinc-400">5-10 días hábiles</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-3 px-4 font-medium text-white">OXXO</td>
                <td className="py-3 px-4 text-zinc-400">Transferencia SPEI en 3-5 días</td>
              </tr>
              <tr className="border-b border-zinc-800 bg-zinc-900/30">
                <td className="py-3 px-4 font-medium text-white">SPEI</td>
                <td className="py-3 px-4 text-zinc-400">Transferencia SPEI en 3-5 días</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Preguntas Frecuentes</h2>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="font-bold text-white mb-2">¿Puedo pedir reembolso si ya descargué los videos?</h3>
            <p className="mb-0 text-zinc-400">
              <span className="text-white font-medium">Sí, nuestra garantía aplica aunque hayas descargado todo el contenido.</span>{' '}
              Confiamos en que si pides un reembolso es porque realmente no quedaste satisfecho.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="font-bold text-white mb-2">¿Qué pasa con mi cuenta después del reembolso?</h3>
            <p className="mb-0 text-zinc-400">
              Tu cuenta se desactiva y pierdes acceso al contenido.
              Puedes volver a comprar en el futuro si lo deseas.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="font-bold text-white mb-2">¿Hay alguna condición para el reembolso?</h3>
            <p className="mb-0 text-zinc-400">
              La única condición es que la solicitud sea dentro de los primeros 30 días
              después de tu compra. No hay condiciones adicionales.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="font-bold text-white mb-2">¿Puedo pedir reembolso parcial?</h3>
            <p className="mb-0 text-zinc-400">
              No ofrecemos reembolsos parciales. El reembolso es siempre por el 100%
              del monto pagado.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>Nuestro Compromiso</h2>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6 md:p-8">
          <p className="mb-4 text-zinc-400">
            En Bear Beat llevamos más de 3 años sirviendo a DJs profesionales en México y LATAM.
            Nuestra tasa de reembolso es menor al 1% porque nos esforzamos en entregar un
            producto de calidad. Pero si por alguna razón no quedas satisfecho, respetamos tu
            decisión y procesamos tu reembolso sin problemas.
          </p>
          <p className="mb-0 font-medium text-white">Tu satisfacción es nuestra prioridad.</p>
        </div>
      </section>
    </LegalPageLayout>
  )
}
