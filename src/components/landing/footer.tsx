import Link from 'next/link'

export function Footer() {
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

          {/* Soporte */}
          <div>
            <h3 className="font-semibold mb-4">Soporte</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a href="mailto:support@videoremixesdj.com" className="hover:text-foreground transition-colors">
                  Contacto
                </a>
              </li>
              <li>
                <a href="https://wa.me/5215512345678?text=Hola%2C%20necesito%20ayuda%20con%20Bear%20Beat" className="hover:text-foreground transition-colors">
                  WhatsApp
                </a>
              </li>
            </ul>
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
