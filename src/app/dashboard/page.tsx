'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackPageView } from '@/lib/tracking'
import { Globe, Rocket, Copy, Eye, EyeOff, Check, Download, Link2, Move } from 'lucide-react'

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

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') === 'ftp' ? 'ftp' : 'web'
  const [user, setUser] = useState<UserProfile | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'web' | 'ftp'>(tabFromUrl)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-[#08E1F7]/30 border-t-[#08E1F7] rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* A. Tarjeta de Bienvenida (Hero) */}
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

      {/* B. Selector de Método (Segmented Control) */}
      <div
        className="inline-flex p-1 rounded-xl border"
        style={{ background: CARD_BG, borderColor: BORDER }}
      >
        <button
          onClick={() => setActiveTab('web')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'web'
              ? 'bg-[#08E1F7] text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Globe className="h-5 w-5" />
          Descarga Web
        </button>
        <button
          onClick={() => setActiveTab('ftp')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'ftp'
              ? 'bg-[#08E1F7] text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Rocket className="h-5 w-5" />
          Descarga FTP
        </button>
      </div>

      {/* C / D. Contenido según tab */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'web' ? (
          /* C. Vista Web */
          <section
            className="rounded-2xl p-6 md:p-8 border text-center"
            style={{ background: CARD_BG, borderColor: BORDER }}
          >
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(8,225,247,0.1)', border: `1px solid rgba(8,225,247,0.3)` }}
              >
                <Globe className="h-10 w-10 text-[#08E1F7]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Explora y descarga videos individuales o por género
            </h2>
            <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
              Navega por la biblioteca desde el navegador, sin instalar nada.
            </p>
            <Link href="/contenido">
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#08E1F7] text-black font-black text-lg px-8 py-4 rounded-xl hover:brightness-110 transition-all"
              >
                IR A LA BIBLIOTECA →
              </button>
            </Link>
          </section>
        ) : (
          /* D. Vista FTP */
          <section
            className="rounded-2xl p-6 md:p-8 border space-y-6"
            style={{ background: CARD_BG, borderColor: BORDER }}
          >
            <h2 className="text-lg font-bold text-white">Credenciales de Acceso FTP</h2>
            {ftp ? (
              <>
                <div className="space-y-3">
                  {[
                    { label: 'Host', value: ftp.host, key: 'host' },
                    { label: 'Puerto', value: ftp.port, key: 'port' },
                    { label: 'Usuario', value: ftp.user, key: 'user' },
                  ].map(({ label, value, key }) => (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 border"
                      style={{ background: DASHBOARD_BG, borderColor: BORDER }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="font-mono text-sm text-white break-all">{value}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(value ?? '', key)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-[#08E1F7] hover:bg-white/5 transition-colors"
                      >
                        {copied === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied === key ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  ))}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 border"
                    style={{ background: DASHBOARD_BG, borderColor: BORDER }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Contraseña</p>
                      <p className="font-mono text-sm text-white">
                        {showPassword ? ftp.pass : '••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(ftp.pass ?? '', 'pass')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-[#08E1F7] hover:bg-white/5 transition-colors"
                      >
                        {copied === 'pass' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copiar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t" style={{ borderColor: BORDER }}>
                  <h3 className="text-sm font-bold text-white mb-4">Instrucciones para FileZilla</h3>
                  <ul className="space-y-4">
                    {[
                      { icon: Download, title: 'Descarga FileZilla', desc: 'Gratis en filezilla-project.org', link: 'https://filezilla-project.org' },
                      { icon: Link2, title: 'Conecta', desc: 'Servidor, usuario, contraseña y puerto en la barra superior' },
                      { icon: Move, title: 'Arrastra', desc: 'Arrastra carpetas del servidor a tu PC para descargar' },
                    ].map((step, i) => {
                      const s = step as { icon: typeof Download; title: string; desc: string; link?: string }
                      return (
                        <li key={i} className="flex gap-4">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                            style={{ background: '#08E1F7' }}
                          >
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-white text-sm">{s.title}</p>
                            <p className="text-gray-500 text-xs">
                              {s.desc}
                              {s.link && (
                                <>
                                  {' '}
                                  <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-[#08E1F7] hover:underline">
                                    Descargar →
                                  </a>
                                </>
                              )}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <div
                className="rounded-xl px-4 py-6 border text-center"
                style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}
              >
                <p className="font-medium text-amber-200 mb-1">Tus credenciales FTP en proceso</p>
                <p className="text-sm text-gray-400">
                  Se generan al activar tu compra. Si acabas de pagar, espera unos minutos y recarga. Si ya pasó más tiempo, contacta soporte.
                </p>
              </div>
            )}
          </section>
        )}
      </motion.div>

      {/* E. Actividad Reciente */}
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
