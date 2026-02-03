import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ChatWidget from '@/components/chat/ChatWidget' // <--- CORREGIDO (Importación por defecto)
import { Toaster } from 'sonner'
import { TrackingScripts } from '@/components/tracking/TrackingScripts'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bear Beat | Video Remixes Exclusivos para DJs',
  description: 'La membresía definitiva de video remixes para DJs profesionales. Intro, Outro y Clean versions en alta calidad.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <TrackingScripts />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
        <ChatWidget />
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  )
}
