import { LegalPageLayout } from '@/components/legal/LegalPageLayout'

export const metadata = {
  title: 'Política de Privacidad | Bear Beat',
  description: 'Cómo Bear Beat recopila, usa y protege tu información personal',
}

export default function PrivacidadPage() {
  return (
    <LegalPageLayout title="Política de Privacidad" lastUpdated="Enero 2026" titleCentered>
      <section>
        <h2>1. Información que Recopilamos</h2>
        <p>En Bear Beat recopilamos la siguiente información:</p>
        <h3>Información que nos proporcionas</h3>
        <ul>
          <li>Nombre completo</li>
          <li>Dirección de correo electrónico</li>
          <li>Número de teléfono (opcional, para contacto)</li>
          <li>Información de pago (procesada por Stripe)</li>
        </ul>
        <h3>Información recopilada automáticamente</h3>
        <ul>
          <li>Dirección IP</li>
          <li>Tipo de navegador y dispositivo</li>
          <li>Páginas visitadas y acciones realizadas</li>
          <li>Fuente de tráfico (UTMs, referrers)</li>
          <li>Cookies y tecnologías similares</li>
        </ul>
      </section>

      <section>
        <h2>2. Cómo Usamos tu Información</h2>
        <p>Utilizamos tu información para:</p>
        <ul>
          <li>Procesar tus compras y entregarte acceso al contenido</li>
          <li>Enviarte confirmaciones y notificaciones sobre tu cuenta</li>
          <li>Proporcionarte soporte técnico</li>
          <li>Mejorar nuestros productos y servicios</li>
          <li>Enviarte comunicaciones de marketing (si lo autorizas)</li>
          <li>Prevenir fraudes y actividades ilegales</li>
        </ul>
      </section>

      <section>
        <h2>3. Compartición de Información</h2>
        <p>Compartimos tu información únicamente con:</p>
        <ul>
          <li><strong className="text-white font-bold">Stripe:</strong> Para procesar pagos de forma segura</li>
          <li><strong className="text-white font-bold">Supabase:</strong> Para almacenar datos de forma segura</li>
          <li><strong className="text-white font-bold">ManyChat:</strong> Para comunicaciones por Messenger/Instagram</li>
          <li><strong className="text-white font-bold">Meta (Facebook):</strong> Para análisis y publicidad</li>
        </ul>
        <p>
          No vendemos, alquilamos ni compartimos tu información personal con terceros para fines de marketing.
        </p>
      </section>

      <section>
        <h2>4. Cookies y Tecnologías de Seguimiento</h2>
        <p>Utilizamos cookies y tecnologías similares para:</p>
        <ul>
          <li>Mantener tu sesión activa</li>
          <li>Recordar tus preferencias</li>
          <li>Analizar el uso del sitio</li>
          <li>Personalizar publicidad</li>
        </ul>
        <p>
          Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.
        </p>
      </section>

      <section>
        <h2>5. Seguridad de los Datos</h2>
        <p>Implementamos medidas de seguridad para proteger tu información:</p>
        <ul>
          <li>Encriptación SSL/TLS en todas las conexiones</li>
          <li>Almacenamiento seguro con Supabase (encriptación en reposo)</li>
          <li>Procesamiento de pagos PCI-compliant con Stripe</li>
          <li>Acceso restringido a datos personales</li>
        </ul>
      </section>

      <section>
        <h2>6. Tus Derechos</h2>
        <p>Tienes derecho a:</p>
        <ul>
          <li>Acceder a tus datos personales</li>
          <li>Corregir datos inexactos</li>
          <li>Solicitar la eliminación de tus datos</li>
          <li>Oponerte al procesamiento de tus datos</li>
          <li>Retirar tu consentimiento en cualquier momento</li>
        </ul>
        <p>Para ejercer estos derechos, utiliza los canales de soporte indicados en el sitio.</p>
      </section>

      <section>
        <h2>7. Retención de Datos</h2>
        <p>
          Conservamos tus datos personales mientras tu cuenta esté activa o según sea necesario para
          proporcionarte servicios. Los datos de transacciones se conservan según los requisitos legales
          y fiscales aplicables (generalmente 5 años).
        </p>
      </section>

      <section>
        <h2>8. Menores de Edad</h2>
        <p>
          Nuestros servicios están dirigidos a personas mayores de 18 años. No recopilamos
          intencionalmente información de menores de edad.
        </p>
      </section>

      <section>
        <h2>9. Cambios a esta Política</h2>
        <p>
          Podemos actualizar esta política periódicamente. Te notificaremos sobre cambios significativos
          a través de email o aviso en el sitio web.
        </p>
      </section>

      <p className="mt-12 text-sm text-zinc-500 text-center">
        Para cualquier duda, contáctanos a través del chat de soporte disponible en la web o vía Messenger/Instagram.
      </p>
    </LegalPageLayout>
  )
}
