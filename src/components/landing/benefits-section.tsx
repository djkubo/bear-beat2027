export function BenefitsSection() {
  const benefits = [
    {
      emoji: '💰',
      title: 'Solo pagas UNA vez',
      description: '$350 pesos y ya. NO pagas cada mes. Es tuyo para siempre.',
      highlight: 'Sin mensualidades',
    },
    {
      emoji: '⚡',
      title: 'Acceso al INSTANTE',
      description: 'En cuanto pagas, te llega tu acceso por email y WhatsApp. En 1 minuto ya puedes descargar.',
      highlight: 'Sin esperas',
    },
    {
      emoji: '📥',
      title: 'Descargas ILIMITADAS',
      description: 'Descarga todo las veces que quieras. Se te borró? Lo vuelves a descargar. Sin problema.',
      highlight: 'Sin límites',
    },
    {
      emoji: '🎵',
      title: 'Videos NUEVOS cada mes',
      description: 'Videos HD y 4K de la mejor calidad. Organizados por género. Fácil de encontrar lo que buscas.',
      highlight: 'HD/4K',
    },
    {
      emoji: '🛡️',
      title: '100% SEGURO',
      description: 'Si no te gusta, te devolvemos tu dinero en 7 días. Sin preguntas.',
      highlight: 'Garantía',
    },
    {
      emoji: '🌎',
      title: 'Descarga RÁPIDO',
      description: 'Desde tu navegador o con FileZilla. Funciona en todo el mundo. Internet rápido.',
      highlight: 'Global',
    },
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-bear-blue/5 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-extrabold mb-4">
            ¿Por qué comprar aquí?
          </h2>
          <p className="text-2xl font-bold text-bear-blue">
            6 razones súper claras 👇
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-xl border-2 border-bear-blue/20 hover:border-bear-blue/60 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className="text-6xl mb-4 text-center">{benefit.emoji}</div>
              
              <div className="text-center mb-4">
                <span className="inline-block bg-bear-blue text-bear-black px-4 py-1 rounded-full text-sm font-bold">
                  {benefit.highlight}
                </span>
              </div>
              
              <h3 className="text-2xl font-extrabold mb-3 text-center">
                {benefit.title}
              </h3>
              
              <p className="text-base leading-relaxed text-muted-foreground text-center">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Final */}
        <div className="text-center mt-16">
          <p className="text-3xl font-bold mb-6">
            ¿Listo para tener todo esto? 🚀
          </p>
          <a href="/checkout">
            <button className="bg-bear-blue text-bear-black px-16 py-8 rounded-2xl text-3xl font-extrabold hover:bg-bear-blue/90 shadow-2xl btn-pulse transform hover:scale-105 transition-all">
              🛒 COMPRAR POR $350 MXN
            </button>
          </a>
          <p className="text-sm text-muted-foreground mt-4">
            👆 Haz clic aquí para comprar ahora 👆
          </p>
        </div>
      </div>
    </section>
  )
}
