'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { trackPageView } from '@/lib/tracking'

// ==========================================
// DASHBOARD - Panel Premium con Instrucciones
// Diseño consistente con el embudo
// ==========================================

interface Purchase {
  id: number
  pack_id: number
  amount_paid: number
  currency: string
  ftp_username?: string
  ftp_password?: string
  purchased_at: string
}

interface UserProfile {
  id: string
  email: string
  name: string
  phone?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'web' | 'ftp'>('web')
  const [ftpReady, setFtpReady] = useState(false)
  
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

      // Obtener perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Si no existe en la tabla users, crear con datos de auth
      if (profileError || !profile) {
        const newProfile = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
        }
        setUser(newProfile as UserProfile)
      } else {
        setUser(profile)
      }

      // Obtener compras (sin filtro de status)
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', authUser.id)
        .order('purchased_at', { ascending: false })

      if (purchasesData) setPurchases(purchasesData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const ftp = user ? {
    host: 'ftp.bearbeat.mx',
    port: '21',
    user: `dj_${user.id.substring(0, 8)}`,
    pass: `BB${user.id.substring(0, 12)}!`
  } : null

  if (loading) {
    return (
      <div className="min-h-screen bg-bear-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* HEADER */}
      <header className="py-4 px-4 border-b border-bear-blue/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" alt="Bear Beat" width={40} height={40} />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden md:block">{user.email}</span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="text-sm text-gray-500 hover:text-white">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* HERO DE ÉXITO */}
      <section className="py-12 px-4 bg-gradient-to-b from-bear-blue/20 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl mb-6">🎉</motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black mb-4"
          >
            ¡Bienvenido, {user.name?.split(' ')[0] || 'DJ'}!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400"
          >
            Tu acceso está activo. Descarga tu contenido ahora mismo.
          </motion.p>
        </div>
      </section>

      {/* TABS DE DESCARGA */}
      <main className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* SELECTOR DE MÉTODO */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setActiveTab('web')}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                activeTab === 'web' 
                  ? 'bg-bear-blue text-bear-black' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              🌐 Descarga Web
            </button>
            <button
              onClick={() => setActiveTab('ftp')}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                activeTab === 'ftp' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              📁 Descarga FTP
            </button>
          </div>

          {/* CONTENIDO DEL TAB */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {activeTab === 'web' ? (
              /* DESCARGA WEB */
              <div className="bg-white/5 border-2 border-bear-blue/30 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-bear-blue/20 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">🌐</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Descarga por Navegador</h2>
                    <p className="text-gray-400">Fácil, rápido, sin instalar nada</p>
                  </div>
                </div>

                <div className="bg-bear-blue/10 border border-bear-blue/30 rounded-2xl p-6 mb-6">
                  <h3 className="font-bold text-bear-blue mb-3">✅ Ideal para:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Descargar videos específicos que necesitas</li>
                    <li>• Ver previews antes de descargar</li>
                    <li>• Acceso desde celular o tablet</li>
                    <li>• Descargas individuales rápidas</li>
                  </ul>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-bold mb-4">3 simples pasos:</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {[
                      { step: '1', icon: '📂', text: 'Navega por géneros' },
                      { step: '2', icon: '👁️', text: 'Ve las previews' },
                      { step: '3', icon: '⬇️', text: 'Descarga lo que quieras' },
                    ].map((item) => (
                      <div key={item.step} className="bg-white/5 rounded-xl p-4">
                        <span className="text-3xl">{item.icon}</span>
                        <p className="text-sm mt-2">{item.text}</p>
                      </div>
                    ))}
                  </div>

                  <Link href="/contenido">
                    <button className="bg-bear-blue text-bear-black font-black text-xl px-12 py-5 rounded-xl hover:bg-bear-blue/90">
                      IR AL EXPLORADOR DE VIDEOS →
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              /* DESCARGA FTP */
              <div className="bg-white/5 border-2 border-purple-500/30 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">📁</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Descarga Masiva por FTP</h2>
                    <p className="text-gray-400">Descarga TODO de una vez con FileZilla</p>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-6">
                  <h3 className="font-bold text-purple-400 mb-3">🚀 Ideal para:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Descargar todos los videos de una vez</li>
                    <li>• Descargas más rápidas y estables</li>
                    <li>• Reanudar descargas interrumpidas</li>
                    <li>• Sincronizar carpetas completas</li>
                  </ul>
                </div>

                {ftp && (
                  <>
                    {/* CREDENCIALES */}
                    <div className="bg-black/50 rounded-2xl p-6 mb-6">
                      <h3 className="font-bold text-sm text-purple-400 mb-4 flex items-center gap-2">
                        🔐 TUS CREDENCIALES FTP (PRIVADAS)
                      </h3>
                      
                      <div className="space-y-3">
                        {[
                          { label: 'Servidor', value: ftp.host, key: 'host' },
                          { label: 'Puerto', value: ftp.port, key: 'port' },
                          { label: 'Usuario', value: ftp.user, key: 'user' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                            <div>
                              <p className="text-xs text-gray-500">{item.label}</p>
                              <p className="font-mono text-lg">{item.value}</p>
                            </div>
                            <button onClick={() => copy(item.value, item.key)} className="text-2xl hover:scale-110 transition-transform">
                              {copied === item.key ? '✅' : '📋'}
                            </button>
                          </div>
                        ))}
                        
                        {/* Contraseña especial */}
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                          <div>
                            <p className="text-xs text-gray-500">Contraseña</p>
                            <p className="font-mono text-lg">{showPassword ? ftp.pass : '••••••••••••'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setShowPassword(!showPassword)} className="text-2xl hover:scale-110">
                              {showPassword ? '🙈' : '👁️'}
                            </button>
                            <button onClick={() => copy(ftp.pass, 'pass')} className="text-2xl hover:scale-110">
                              {copied === 'pass' ? '✅' : '📋'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* INSTRUCCIONES PASO A PASO */}
                    <div className="bg-white/5 rounded-2xl p-6">
                      <h3 className="font-bold mb-4">📖 Cómo conectar con FileZilla:</h3>
                      
                      <div className="space-y-4">
                        {[
                          { num: '1', title: 'Descarga FileZilla (gratis)', desc: 'Ve a filezilla-project.org y descarga la versión para tu sistema', link: 'https://filezilla-project.org', linkText: 'Descargar FileZilla →' },
                          { num: '2', title: 'Abre FileZilla', desc: 'Ejecuta el programa después de instalarlo' },
                          { num: '3', title: 'Ingresa los datos', desc: 'En la barra superior, copia el servidor, usuario, contraseña y puerto' },
                          { num: '4', title: 'Clic en "Conexión rápida"', desc: 'Se conectará al servidor y verás las carpetas' },
                          { num: '5', title: 'Arrastra para descargar', desc: 'Arrastra las carpetas del lado derecho al izquierdo para descargar' },
                        ].map((step) => (
                          <div key={step.num} className="flex gap-4">
                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                              {step.num}
                            </div>
                            <div>
                              <p className="font-bold">{step.title}</p>
                              <p className="text-sm text-gray-400">{step.desc}</p>
                              {step.link && (
                                <a href={step.link} target="_blank" className="text-purple-400 text-sm hover:underline">
                                  {step.linkText}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>

          {/* SOPORTE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-gradient-to-r from-bear-blue/10 to-cyan-500/10 border border-bear-blue/20 rounded-3xl p-6"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl">💬</span>
                <div>
                  <h3 className="font-bold text-xl">¿Necesitas ayuda?</h3>
                  <p className="text-gray-400">Te respondemos en menos de 5 minutos</p>
                </div>
              </div>
              <div className="flex gap-3">
                <a href="https://m.me/104901938679498" target="_blank" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2">
                  💬 Messenger
                </a>
                <a href="https://wa.me/5215512345678?text=Hola%2C%20necesito%20ayuda%20con%20Bear%20Beat" target="_blank" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2">
                  📱 WhatsApp
                </a>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  )
}
