export function StatsSection() {
  return (
    <section className="py-10 border-y border-white/5 bg-black/50">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm font-mono text-zinc-500 mb-6 uppercase tracking-widest">
          COMPATIBLE CON EL ESTÁNDAR DE LA INDUSTRIA
        </p>
        
        {/* LOGOS EN ESCALA DE GRISES (Poner imágenes reales en /public/logos/ si las tienes, o texto estilizado por ahora) */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
           <h3 className="text-2xl font-black text-white tracking-tighter">serato</h3>
           <h3 className="text-2xl font-black text-white tracking-tighter">rekordbox</h3>
           <h3 className="text-2xl font-black text-white tracking-tighter">VirtualDJ</h3>
           <h3 className="text-2xl font-black text-white tracking-tighter">Pioneer DJ</h3>
           <h3 className="text-2xl font-black text-white tracking-tighter">DENON DJ</h3>
        </div>

        <div className="mt-10 p-6 bg-zinc-900/50 rounded-2xl border border-white/5 inline-flex items-center gap-4">
          <div className="flex -space-x-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-xs">🎧</div>
            ))}
          </div>
          <div className="text-left">
            <p className="text-white font-bold">Únete a +500 DJs de Élite</p>
            <p className="text-xs text-zinc-400">Que ya están usando Bear Beat en sus eventos.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
