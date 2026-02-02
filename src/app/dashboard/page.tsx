'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { trackPageView } from '@/lib/tracking'
import {
  Globe,
  FolderOpen,
  Zap,
  Copy,
  Eye,
  EyeOff,
  Check,
  Unlock,
  Lock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1jGj20PjgnsbWN1Zbs7sV37zxOUaQxlrd?usp=share_link'

const DASHBOARD_BG = '#0a0a0a'
const CARD_BG = '#121212'
const BORDER = '#27272a'

interface Purchase {
  id: number
  pack_id: number
  ftp_username?: string
  ftp_password?: string
  purchased_at: string
  pack?: { name: string; slug: string } | null
}

interface UserProfile {
  id: string
  email: string
  name: string
}

// ——— Vista para usuarios CON compra (3 vías: Web, Google Drive, FTP) ———
function DashboardActive({
  user,
  purchases,
}: {
  user: UserProfile
  purchases: Purchase[]
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState<'ftp' | 'drive' | 'web' | null>(null)
  const [ftpClientTab, setFtpClientTab] = useState<'filezilla' | 'airexplorer'>('filezilla')

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const purchaseWithFtp = purchases.find((p) => p.ftp_username && p.ftp_password)
  const ftpHost = purchaseWithFtp?.ftp_username?.includes('-sub')
    ? `${purchaseWithFtp.ftp_username}.your-storagebox.de`
    : (typeof process.env.NEXT_PUBLIC_FTP_HOST === 'string' ? process.env.NEXT_PUBLIC_FTP_HOST : 'ftp.bearbeat.mx')
  const ftp = purchaseWithFtp
    ? {
        host: ftpHost,
        port: '21',
        user: purchaseWithFtp.ftp_username,
        pass: purchaseWithFtp.ftp_password,
      }
    : null

  const packName = purchases[0]?.pack?.name ?? (purchases[0] as any)?.packs?.name ?? 'Pack Enero 2026'
  const firstName = user?.name?.split(' ')[0] || 'DJ'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 md:p-8 border"
        style={{
          background: `linear-gradient(180deg, ${CARD_BG} 0%, #0a0a0a 100%)`,
          borderColor: BORDER,
        }}
      >
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
          ¡Hola, {firstName}! 👋
        </h1>
        <p className="text-gray-400 text-base md:text-lg">
          Tu {packName} está listo para descarga.
        </p>
      </motion.section>

      {/* Grid de 3 tarjetas: Web, Google Drive, FTP */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="grid md:grid-cols-3 gap-4"
      >
        {/* 🌐 Biblioteca Online */}
        <div
          className="rounded-2xl p-6 border flex flex-col"
          style={{ background: CARD_BG, borderColor: BORDER }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(8,225,247,0.1)', border: '1px solid rgba(8,225,247,0.3)' }}>
              <Globe className="h-7 w-7 text-[#08E1F7]" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white mb-1 text-center">Biblioteca Online</h2>
          <p className="text-gray-400 text-sm mb-6 text-center flex-1">Visualiza y descarga video por video.</p>
          <Link href="/contenido" className="block">
            <button className="w-full inline-flex items-center justify-center gap-2 bg-[#08E1F7] text-black font-black text-sm py-3 rounded-xl hover:brightness-110 transition-all">
              IR A LA BIBLIOTECA
            </button>
          </Link>
        </div>

        {/* 📂 Google Drive */}
        <div
          className="rounded-2xl p-6 border flex flex-col"
          style={{ background: CARD_BG, borderColor: BORDER }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.4)' }}>
              <FolderOpen className="h-7 w-7 text-blue-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white mb-1 text-center">Google Drive</h2>
          <p className="text-gray-400 text-sm mb-6 text-center flex-1">Acceso rápido y compatible con todo.</p>
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <button className="w-full inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black text-sm py-3 rounded-xl transition-all">
              ABRIR CARPETA DRIVE <ExternalLink className="h-4 w-4" />
            </button>
          </a>
        </div>

        {/* ⚡ FTP Directo */}
        <div
          className="rounded-2xl p-6 border flex flex-col"
          style={{ background: CARD_BG, borderColor: BORDER }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)' }}>
              <Zap className="h-7 w-7 text-amber-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white mb-1 text-center">Acceso FTP Directo</h2>
          <p className="text-gray-400 text-sm mb-6 text-center flex-1">Para descargar todo el pack de golpe.</p>
          <button
            onClick={() => setGuideOpen(guideOpen === 'ftp' ? null : 'ftp')}
            className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-black text-sm py-3 rounded-xl transition-all"
          >
            VER DATOS Y GUÍAS
          </button>
        </div>
      </motion.section>

      {/* Guía de Descarga Paso a Paso (acordeón) */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: CARD_BG, borderColor: BORDER }}
      >
        <h3 className="text-lg font-bold text-white px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          Guía de Descarga Paso a Paso
        </h3>

        {/* Acordeón: FTP */}
        <div className="border-b" style={{ borderColor: BORDER }}>
          <button
            onClick={() => setGuideOpen(guideOpen === 'ftp' ? null : 'ftp')}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 font-medium text-white">
              <Zap className="h-5 w-5 text-amber-400" />
              Detalles FTP
            </span>
            {guideOpen === 'ftp' ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          </button>
          {guideOpen === 'ftp' && (
            <div className="px-6 pb-6 pt-0 space-y-6" style={{ background: DASHBOARD_BG }}>
              {ftp ? (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-300">Credenciales (cópialas abajo)</p>
                    {[
                      { label: 'Host', value: ftp.host, key: 'host' },
                      { label: 'Puerto', value: ftp.port, key: 'port' },
                      { label: 'Usuario', value: ftp.user, key: 'user' },
                    ].map(({ label, value, key }) => (
                      <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 border" style={{ background: CARD_BG, borderColor: BORDER }}>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="font-mono text-sm text-white break-all">{value}</p>
                        </div>
                        <button onClick={() => copyToClipboard(value ?? '', key)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-[#08E1F7] hover:bg-white/5 transition-colors">
                          {copied === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied === key ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 border" style={{ background: CARD_BG, borderColor: BORDER }}>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Contraseña</p>
                        <p className="font-mono text-sm text-white">{showPassword ? ftp.pass : '••••••••'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowPassword(!showPassword)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button onClick={() => copyToClipboard(ftp.pass ?? '', 'pass')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-[#08E1F7] hover:bg-white/5 transition-colors">
                          {copied === 'pass' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Pestañas: FileZilla vs Air Explorer */}
                  <div className="inline-flex p-1 rounded-lg border" style={{ background: CARD_BG, borderColor: BORDER }}>
                    <button onClick={() => setFtpClientTab('filezilla')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${ftpClientTab === 'filezilla' ? 'bg-[#08E1F7] text-black' : 'text-gray-400 hover:text-white'}`}>
                      Opción A: FileZilla (Estándar)
                    </button>
                    <button onClick={() => setFtpClientTab('airexplorer')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${ftpClientTab === 'airexplorer' ? 'bg-[#08E1F7] text-black' : 'text-gray-400 hover:text-white'}`}>
                      Opción B: Air Explorer (Pro)
                    </button>
                  </div>
                  {ftpClientTab === 'filezilla' && (
                    <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
                      <li>Descarga e instala FileZilla Client (Gratis).</li>
                      <li>Copia el <strong className="text-white">Host</strong>, <strong className="text-white">Usuario</strong> y <strong className="text-white">Contraseña</strong> de arriba.</li>
                      <li>Pégalos en la barra de &quot;Conexión Rápida&quot; de FileZilla.</li>
                      <li>Si pide puerto, usa el <strong className="text-white">21</strong> (o déjalo vacío).</li>
                      <li>Arrastra las carpetas del lado derecho (Servidor) al izquierdo (Tu PC).</li>
                    </ol>
                  )}
                  {ftpClientTab === 'airexplorer' && (
                    <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
                      <li>Abre Air Explorer y ve a &quot;Cuentas&quot;.</li>
                      <li>Añade una nueva cuenta y selecciona el logo de <strong className="text-white">FTP</strong>.</li>
                      <li>En servidor pon el <strong className="text-white">Host</strong>, y rellena <strong className="text-white">Usuario</strong> y <strong className="text-white">Contraseña</strong>.</li>
                      <li>Dale a conectar. Ahora puedes sincronizar carpetas completas de forma estable y reanudar si se corta internet.</li>
                    </ol>
                  )}
                </>
              ) : (
                <div className="rounded-xl px-4 py-6 border text-center" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                  <p className="font-medium text-amber-200 mb-1">Tus credenciales FTP en proceso</p>
                  <p className="text-sm text-gray-400">Se generan al activar tu compra. Si acabas de pagar, espera unos minutos y recarga. Si ya pasó más tiempo, usa el chat de soporte (esquina inferior derecha).</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acordeón: Google Drive */}
        <div className="border-b" style={{ borderColor: BORDER }}>
          <button onClick={() => setGuideOpen(guideOpen === 'drive' ? null : 'drive')} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors">
            <span className="flex items-center gap-2 font-medium text-white">
              <FolderOpen className="h-5 w-5 text-blue-400" />
              Detalles Google Drive
            </span>
            {guideOpen === 'drive' ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          </button>
          {guideOpen === 'drive' && (
            <div className="px-6 pb-6 pt-0 space-y-3" style={{ background: DASHBOARD_BG }}>
              <p className="text-sm text-gray-300">Haz clic en el botón para abrir la carpeta compartida.</p>
              <p className="text-sm text-gray-300"><strong className="text-white">Tip:</strong> Si seleccionas muchos archivos, Google los comprimirá en varios Zips. Ten paciencia mientras se preparan.</p>
              <p className="text-sm text-gray-300">Puedes usar &quot;Añadir a mi unidad&quot; si tienes espacio en tu propia nube.</p>
            </div>
          )}
        </div>

        {/* Acordeón: Web */}
        <div>
          <button onClick={() => setGuideOpen(guideOpen === 'web' ? null : 'web')} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors">
            <span className="flex items-center gap-2 font-medium text-white">
              <Globe className="h-5 w-5 text-[#08E1F7]" />
              Detalles Web
            </span>
            {guideOpen === 'web' ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          </button>
          {guideOpen === 'web' && (
            <div className="px-6 pb-6 pt-0 space-y-3" style={{ background: DASHBOARD_BG }}>
              <p className="text-sm text-gray-300">Navega por géneros en el menú de la izquierda.</p>
              <p className="text-sm text-gray-300">Usa el buscador para encontrar artistas o canciones por BPM.</p>
              <p className="text-sm text-gray-300">Haz clic en el botón de descarga al lado de cada video.</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Actividad Reciente */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: CARD_BG, borderColor: BORDER }}
      >
        <h3 className="text-lg font-bold text-white px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          Actividad Reciente
        </h3>
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b" style={{ borderColor: BORDER }}>
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Acción</th>
                <th className="pb-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-500">
                  Aún no hay descargas registradas
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  )
}

// ——— Vista para usuarios SIN compra (Upsell) ———
function DashboardEmpty({ user }: { user: UserProfile }) {
  const firstName = user?.name?.split(' ')[0] || 'Usuario'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero de Bienvenida */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 md:p-8 border"
        style={{
          background: `linear-gradient(180deg, ${CARD_BG} 0%, #0a0a0a 100%)`,
          borderColor: BORDER,
        }}
      >
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
          ¡Hola, {firstName}! 👋
        </h1>
        <p className="text-gray-400 text-base md:text-lg">
          Tu cuenta está creada. Activa tu acceso para empezar a descargar.
        </p>
      </motion.section>

      {/* Tarjeta CTA principal */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{
          background: CARD_BG,
          borderColor: '#08E1F7',
          boxShadow: '0 0 24px rgba(8,225,247,0.15)',
        }}
      >
        <div className="flex justify-center mb-6">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(8,225,247,0.15)', border: '2px solid rgba(8,225,247,0.5)' }}
          >
            <Unlock className="h-12 w-12 text-[#08E1F7]" />
          </div>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-white text-center mb-4">
          Desbloquea el Pack Enero 2026
        </h2>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-300 mb-8">
          <li>🔓 Acceso a 1,268 Videos</li>
          <li>🚀 Servidores FTP Privados</li>
          <li>⚡ Descargas Ilimitadas</li>
        </ul>
        <Link href="/checkout?pack=enero-2026" className="block">
          <button
            className="w-full py-4 rounded-xl font-black text-lg bg-[#08E1F7] text-black hover:brightness-110 transition-all"
          >
            ACTIVAR MI ACCESO POR $350 MXN →
          </button>
        </Link>
      </motion.section>

      {/* Vista previa bloqueada: 3 vías (Web, Drive, FTP) */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border overflow-hidden relative"
        style={{ background: CARD_BG, borderColor: BORDER }}
      >
        <h3 className="text-lg font-bold text-white px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          Herramientas Pro (Bloqueado)
        </h3>
        <div className="relative p-6 grid md:grid-cols-3 gap-4">
          <div className="absolute inset-0 flex items-center justify-center z-10 rounded-b-2xl" style={{ background: 'rgba(0,0,0,0.65)' }}>
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-amber-500/50 bg-black/40">
                <Lock className="h-8 w-8 text-amber-400" />
              </div>
              <p className="text-sm font-medium">Activa tu acceso para desbloquear</p>
            </div>
          </div>
          <div className="rounded-xl p-6 border opacity-60" style={{ background: DASHBOARD_BG, borderColor: BORDER }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(8,225,247,0.1)', border: `1px solid ${BORDER}` }}>
                <Globe className="h-7 w-7 text-gray-500" />
              </div>
            </div>
            <h4 className="font-bold text-white mb-1">Biblioteca Online</h4>
            <p className="text-sm text-gray-500">Video por video</p>
          </div>
          <div className="rounded-xl p-6 border opacity-60" style={{ background: DASHBOARD_BG, borderColor: BORDER }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(66,133,244,0.1)', border: `1px solid ${BORDER}` }}>
                <FolderOpen className="h-7 w-7 text-gray-500" />
              </div>
            </div>
            <h4 className="font-bold text-white mb-1">Google Drive</h4>
            <p className="text-sm text-gray-500">Acceso en la nube</p>
          </div>
          <div className="rounded-xl p-6 border opacity-60" style={{ background: DASHBOARD_BG, borderColor: BORDER }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)', border: `1px solid ${BORDER}` }}>
                <Zap className="h-7 w-7 text-gray-500" />
              </div>
            </div>
            <h4 className="font-bold text-white mb-1">Acceso FTP</h4>
            <p className="text-sm text-gray-500">Descarga masiva</p>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    trackPageView('dashboard')
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        window.location.href = '/login?redirect=/dashboard'
        return
      }
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      if (profile) {
        setUser(profile as UserProfile)
      } else {
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          name: authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? 'Usuario',
        })
      }
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*, pack:packs(name, slug)')
        .eq('user_id', authUser.id)
        .order('purchased_at', { ascending: false })
      if (purchasesData) setPurchases(purchasesData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-[#08E1F7]/30 border-t-[#08E1F7] rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const hasPurchase = purchases.length > 0

  return hasPurchase ? (
    <DashboardActive user={user} purchases={purchases} />
  ) : (
    <DashboardEmpty user={user} />
  )
}
