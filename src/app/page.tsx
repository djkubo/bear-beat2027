import HomeLanding from '@/components/landing/HomeLanding'

// Home debe renderizarse sin suspense streaming (evita errores si el usuario navega rapidísimo).
// La data dinámica (pack, stats, acceso) ya se obtiene en cliente via /api/*.
export default function HomePage() {
  return <HomeLanding />
}

