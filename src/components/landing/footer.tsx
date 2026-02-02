import Link from 'next/link'
import { getMessengerUrl, CONTACT_CONFIG } from '@/config/contact'

export function Footer() {
  const { social } = CONTACT_CONFIG

  return (
    <footer className="bg-secondary/30 border-t py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" 
                alt="Bear Beat" 
                className="h-12 w-auto"
              />
              <span className="text-lg font-bold">BEAR BEAT</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tu plataforma de video remixes para DJs profesionales
            </p>
          </div>

          {/* Producto */}
          <div>
            <h3 className="font-semibold mb-4">Producto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#generos" className="hover:text-foreground transition-colors">
                  Géneros
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-foreground transition-colors">
                  Precios
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Mi Cuenta
                </Link>
              </li>
            </ul>
          </div>

          {/* Soporte - centralizado en Chat / redes */}
          <div>
            <h3 className="font-semibold mb-4">Soporte</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Necesitas ayuda? Chatea con nosotros.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <span aria-hidden>📘</span> Facebook
                </a>
              </li>
              <li>
                <a href={getMessengerUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <span aria-hidden>💬</span> Messenger
                </a>
              </li>
              <li>
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-2">
                  <span aria-hidden>📸</span> Instagram
                </a>
              </li>
            </ul>
            <a
              href={getMessengerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block bg-primary text-primary-foreground font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Abrir Chat de Soporte
            </a>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/terminos" className="hover:text-foreground transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="hover:text-foreground transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            © 2026 Bear Beat. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
