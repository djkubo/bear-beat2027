import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'

export const metadata = {
  title: 'Términos de Servicio | Bear Beat',
  description: 'Términos y condiciones de uso de Bear Beat',
}

export default function TerminosPage() {
  return (
    <LegalPageLayout title="Términos de Servicio" lastUpdated="Enero 2026">
      <section>
        <h2>1. Aceptación de los Términos</h2>
        <p>
          Al acceder y utilizar los servicios de Bear Beat, aceptas estos términos de servicio en su totalidad.
          Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestros servicios.
        </p>
      </section>

      <section>
        <h2>2. Descripción del Servicio</h2>
        <p>
          Bear Beat proporciona acceso a packs de video remixes musicales diseñados para uso profesional de DJs.
          El servicio incluye:
        </p>
        <ul>
          <li>Descarga de video remixes en formato digital (HD/4K)</li>
          <li>Acceso a través de plataforma web y/o FTP</li>
          <li>Soporte técnico para descargas</li>
          <li>Actualizaciones del contenido según el plan adquirido</li>
        </ul>
      </section>

      <section>
        <h2>3. Licencia de Uso</h2>
        <p>
          Al adquirir un pack, obtienes una licencia personal e intransferible para:
        </p>
        <ul>
          <li>Usar los videos en presentaciones públicas como DJ</li>
          <li>Almacenar los archivos en tus dispositivos personales</li>
          <li>Utilizar el contenido de manera indefinida</li>
        </ul>
        <p>
          <strong>No está permitido:</strong> redistribuir, revender, compartir públicamente los archivos,
          o utilizarlos para crear contenido derivado para venta.
        </p>
      </section>

      <section>
        <h2>4. Pagos y Facturación</h2>
        <p>
          Los pagos se procesan de forma segura a través de Stripe. Aceptamos:
        </p>
        <ul>
          <li>Tarjetas de crédito y débito (Visa, Mastercard, American Express)</li>
          <li>Pago en efectivo en OXXO (solo México)</li>
          <li>Transferencia bancaria SPEI (solo México)</li>
        </ul>
        <p>
          Los precios están expresados en Pesos Mexicanos (MXN) o Dólares (USD) según tu ubicación.
        </p>
      </section>

      <section>
        <h2>5. Política de Reembolsos</h2>
        <p>
          Ofrecemos garantía de satisfacción de 30 días. Si no estás satisfecho con tu compra,
          puedes solicitar un reembolso completo dentro de los primeros 30 días posteriores a la compra,
          sin necesidad de dar explicaciones.
        </p>
        <p>
          Para más detalles, consulta nuestra{' '}
          <Link href="/reembolsos">Política de Reembolsos</Link>.
        </p>
      </section>

      <section>
        <h2>6. Privacidad</h2>
        <p>
          Tu privacidad es importante para nosotros. Consulta nuestra{' '}
          <Link href="/privacidad">Política de Privacidad</Link>{' '}
          para conocer cómo recopilamos, usamos y protegemos tu información personal.
        </p>
      </section>

      <section>
        <h2>7. Modificaciones</h2>
        <p>
          Nos reservamos el derecho de modificar estos términos en cualquier momento.
          Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web.
          Te recomendamos revisar periódicamente estos términos.
        </p>
      </section>
    </LegalPageLayout>
  )
}
