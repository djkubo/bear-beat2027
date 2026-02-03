interface StatsSectionProps {
  totalVideos: number
  totalGenres: number
  totalSize: number
}

const BRANDS = [
  { name: 'Pioneer DJ', abbr: 'Pioneer' },
  { name: 'Serato', abbr: 'Serato' },
  { name: 'Rekordbox', abbr: 'Rekordbox' },
  { name: 'VirtualDJ', abbr: 'VDJ' },
]

export function StatsSection({ totalVideos, totalGenres, totalSize }: StatsSectionProps) {
  return (
    <section className="py-16 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Marcas compatibles - escala de grises, baja opacidad */}
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground/80 mb-4">Compatible con todo tu equipo</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 grayscale">
            {BRANDS.map((b) => (
              <span
                key={b.name}
                className="text-lg md:text-xl font-bold text-muted-foreground"
                title={b.name}
              >
                {b.abbr}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-2 group">
            <div className="text-5xl font-bold bg-gradient-to-r from-bear-blue to-bear-blue/70 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
              {totalVideos.toLocaleString()}+
            </div>
            <div className="text-lg font-bold text-foreground">
              Videos HD/4K
            </div>
            <p className="text-sm text-muted-foreground">
              Contenido nuevo cada mes
            </p>
          </div>

          <div className="text-center space-y-2 group">
            <div className="text-5xl font-bold bg-gradient-to-r from-bear-blue to-bear-blue/70 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
              {totalGenres}+
            </div>
            <div className="text-lg font-bold text-foreground">
              Géneros Musicales
            </div>
            <p className="text-sm text-muted-foreground">
              Organizados y categorizados
            </p>
          </div>

          <div className="text-center space-y-2 group">
            <div className="text-5xl font-bold bg-gradient-to-r from-bear-blue to-bear-blue/70 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
              {totalSize} GB
            </div>
            <div className="text-lg font-bold text-foreground">
              De Contenido
            </div>
            <p className="text-sm text-muted-foreground">
              Calidad profesional
            </p>
          </div>
        </div>

        <p className="text-center mt-10 text-lg font-bold text-foreground">
          Únete a la élite de <span className="text-bear-blue">+500 DJs</span> que ya usan Bear Beat
        </p>
      </div>
    </section>
  )
}
