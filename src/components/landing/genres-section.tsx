interface Genre {
  id: number
  name: string
  slug: string
  video_count: number
}

interface GenresSectionProps {
  genres: Genre[]
}

export function GenresSection({ genres }: GenresSectionProps) {
  return (
    <section id="generos" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Géneros Disponibles</h2>
          <p className="text-xl text-muted-foreground">
            Encuentra el contenido perfecto para tus eventos
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {genres.map((genre) => (
            <div
              key={genre.id}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-bear-blue/10 to-bear-black/5 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-bear-blue/20 hover:border-bear-blue/50"
            >
              <div className="relative z-10">
                <div className="text-4xl mb-2">🎵</div>
                <h3 className="text-lg font-bold mb-1">{genre.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {genre.video_count?.toLocaleString() || 0} videos
                </p>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-bear-blue/20 to-bear-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        {genres.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Géneros disponibles próximamente...
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
