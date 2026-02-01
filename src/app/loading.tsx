// ==========================================
// LOADING GLOBAL - Skeleton mientras carga
// ==========================================

export default function Loading() {
  return (
    <div className="min-h-screen bg-bear-black flex items-center justify-center">
      <div className="text-center">
        {/* Logo animado */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-bear-blue/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-bear-blue rounded-full animate-spin" />
        </div>
        
        {/* Texto */}
        <p className="text-bear-blue font-bold text-lg">Cargando...</p>
        <p className="text-gray-500 text-sm mt-2">Bear Beat</p>
      </div>
    </div>
  )
}
