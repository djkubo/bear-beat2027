export function VideoPreviewSection() {
  const demoVideos = [
    {
      title: 'Bad Bunny - Tití Me Preguntó',
      genre: 'Reggaeton',
      resolution: '4K',
      thumbnail: '/logos/BBIMAGOTIPO_Mesa de trabajo 1.png',
    },
    {
      title: 'Peso Pluma - Ella Baila Sola',
      genre: 'Corridos Tumbados',
      resolution: '1080p',
      thumbnail: '/logos/BBIMAGOTIPO_Mesa de trabajo 1.png',
    },
    {
      title: 'Karol G - Provenza',
      genre: 'Pop Latino',
      resolution: '4K',
      thumbnail: '/logos/BBIMAGOTIPO_Mesa de trabajo 1.png',
    },
  ]

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-extrabold mb-4">
            Ve ejemplos GRATIS
          </h2>
          <p className="text-xl text-muted-foreground">
            Estos son algunos de los videos que obtendrás
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {demoVideos.map((video, index) => (
            <div
              key={index}
              className="group bg-card rounded-2xl overflow-hidden shadow-xl border-2 border-bear-blue/20 hover:border-bear-blue/60 transition-all hover:scale-105"
            >
              <div className="aspect-video bg-gradient-to-br from-bear-blue/20 to-bear-black/10 flex items-center justify-center relative">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-32 h-32 opacity-30"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-20 h-20 rounded-full bg-bear-blue/90 hover:bg-bear-blue flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all">
                    <span className="text-4xl">▶️</span>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2">{video.title}</h3>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>🎵 {video.genre}</span>
                  <span>📹 {video.resolution}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-2xl font-bold mb-6">
            ¿Te gustaron? Hay 2,997 videos más... 🤩
          </p>
          <a href="/checkout">
            <button className="bg-bear-blue text-bear-black px-12 py-6 rounded-2xl text-2xl font-extrabold hover:bg-bear-blue/90 shadow-2xl btn-pulse">
              🛒 COMPRAR TODOS POR $350 MXN
            </button>
          </a>
        </div>
      </div>
    </section>
  )
}
