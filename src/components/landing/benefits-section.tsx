export function BenefitsSection() {
  const benefits = [
    {
      emoji: '💰',
      title: 'Tus Pantallas LED Merecen Respeto',
      description: 'No más pixelación vergonzosa. Proyecta imagen de artista Top, no de amateur.',
      highlight: 'Calidad',
    },
    {
      emoji: '⚡',
      title: 'Mezcla Como un Cirujano',
      description: 'Olvídate de entrenar el oído. Todo está calculado matemáticamente para que tus mezclas sean perfectas.',
      highlight: 'Key & BPM',
    },
    {
      emoji: '📥',
      title: 'Tu Tiempo Vale Oro',
      description: 'Descarga 170 GB mientras duermes. Levántate con el trabajo sucio ya hecho.',
      highlight: 'FTP Flash',
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
