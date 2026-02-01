'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { normalizePhoneNumber } from '@/lib/phone'
import { toast } from 'sonner'
import { CountryCode } from 'libphonenumber-js'
import { PhoneInput } from '@/components/ui/phone-input'
import { 
  syncUserWithManyChat, 
  trackPurchaseWithManyChat,
  trackPaymentSuccess,
  trackRegistration,
  trackLogin,
  setUserTrackingInfo,
} from '@/lib/tracking'

// ==========================================
// EMBUDO - COMPLETAR COMPRA (POST-PAGO)
// ==========================================

type PageState = 'loading' | 'success' | 'form' | 'login' | 'activating' | 'done' | 'error'

export default function CompletePurchasePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const sessionId = searchParams.get('session_id')
  
  const [state, setState] = useState<PageState>('loading')
  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Form
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<CountryCode>('MX')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [hasExistingAccount, setHasExistingAccount] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null)
  const [ftpCredentials, setFtpCredentials] = useState<{ ftp_username?: string; ftp_password?: string; ftp_host?: string } | null>(null)
  const [showFtpAccordion, setShowFtpAccordion] = useState(false)

  // Cargar datos de la compra
  useEffect(() => {
    if (!sessionId) {
      setError('No se encontró la sesión de pago')
      setState('error')
      return
    }
    
    loadPurchaseData()
  }, [sessionId])

  const loadPurchaseData = async () => {
    try {
      // PRIMERO: Verificar si el usuario ya está logueado
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      // Obtener datos de Stripe
      const stripeRes = await fetch(`/api/verify-payment?session_id=${sessionId}`)
      const stripeData = await stripeRes.json()
      
      if (stripeRes.ok && stripeData.success) {
        // Pago verificado con Stripe
        const purchaseInfo = {
          stripe_session_id: sessionId,
          pack_id: stripeData.packId || 1,
          pack: stripeData.pack || { name: 'Pack Enero 2026' },
          amount_paid: stripeData.amount,
          currency: stripeData.currency?.toUpperCase() || 'MXN',
          payment_provider: 'stripe',
          stripe_payment_intent: stripeData.paymentIntent,
          customer_email: stripeData.customerEmail,
          customer_name: stripeData.customerName,
          // User ID del usuario que estaba logueado al pagar
          original_user_id: stripeData.userId,
        }
        
        setPurchaseData(purchaseInfo)
        
        // Determinar el usuario: actual logueado O el que estaba logueado al pagar
        const effectiveUserId = currentUser?.id || stripeData.userId
        
        // SI HAY UN USUARIO (logueado ahora O guardado en el pago), ACTIVAR AUTOMÁTICAMENTE
        if (effectiveUserId) {
          console.log('Usuario encontrado, activando compra automáticamente...', effectiveUserId)
          setEmail(currentUser?.email || stripeData.customerEmail || '')
          setName(currentUser?.user_metadata?.name || stripeData.customerName || '')
          
          setState('success')
          
          // Activar directamente después de mostrar éxito
          setTimeout(async () => {
            setState('activating')
            await activatePurchaseForLoggedUser(effectiveUserId, purchaseInfo)
          }, 2000)
          return
        }
        
        // Si no está logueado, mostrar formulario
        if (stripeData.customerEmail) {
          setEmail(stripeData.customerEmail)
          await checkExistingAccount(stripeData.customerEmail)
        }
        if (stripeData.customerName) setName(stripeData.customerName)
        if (stripeData.customerPhone) setPhone(stripeData.customerPhone)
        
        setState('success')
        
        // Después de mostrar éxito, ir al formulario
        setTimeout(() => setState('form'), 2500)
        return
      }
      
      // Fallback: intentar desde la base de datos
      try {
        const { data, error } = await supabase
          .from('pending_purchases')
          .select('*, pack:packs(*)')
          .eq('stripe_session_id', sessionId)
          .single()

        if (!error && data) {
          if (data.status === 'completed') {
            toast.success('¡Tu compra ya está activa!')
            router.push('/dashboard')
            return
          }

          setPurchaseData(data)
          
          if (data.customer_email) {
            setEmail(data.customer_email)
            await checkExistingAccount(data.customer_email)
          }
          if (data.customer_name) setName(data.customer_name)
          
          setState('success')
          setTimeout(() => setState('form'), 2500)
          return
        }
      } catch (dbErr) {
        console.log('DB not available, continuing with Stripe data')
      }

      if (!stripeRes.ok) {
        const msg = String(stripeData?.error || stripeData?.status || '')
        if (msg.includes('Payment not completed') || msg.includes('unpaid')) {
          setError('Tu pago no se completó. Si usaste tarjeta y falló, prueba con OXXO o SPEI desde el checkout.')
        } else if (msg.toLowerCase().includes('card') || msg.includes('402')) {
          setError('Tu tarjeta no pasó. No te preocupes: intenta de nuevo con OXXO o transferencia SPEI (desde la página de pago).')
        } else {
          setError('No pudimos verificar tu pago. ¿Intentaste con OXXO o SPEI? Si ya pagaste, espera unos minutos y recarga; si no, vuelve al checkout y elige otro método.')
        }
        setState('error')
      }
      
    } catch (err) {
      console.error('Error loading purchase:', err)
      setError('No pudimos cargar tu compra. Si acabas de pagar, espera 1 minuto y recarga la página. Si sigue igual, escribe a soporte con tu email de pago.')
      setState('error')
    }
  }

  const checkExistingAccount = async (checkEmail: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', checkEmail)
        .single()
      
      setHasExistingAccount(!!data)
    } catch {
      setHasExistingAccount(false)
    }
  }

  const handleEmailChange = async (newEmail: string) => {
    setEmail(newEmail)
    if (newEmail.includes('@')) {
      await checkExistingAccount(newEmail)
    }
  }

  // Completar con cuenta existente (login)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('activating')

    try {
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        toast.error('Contraseña incorrecta')
        setState('login')
        return
      }

      await activatePurchase(authData.user.id)
      
    } catch (err: any) {
      console.error('Login error:', err)
      toast.error('Error al iniciar sesión')
      setState('login')
    }
  }

  // Completar con cuenta nueva (registro)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    if (!email || !name) {
      toast.error('Completa todos los campos')
      return
    }
    
    if (!phone || phone.length < 8) {
      toast.error('Ingresa un teléfono válido')
      return
    }

    // Validar contraseña si se proporcionó
    if (password && password.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres')
      return
    }

    if (password && password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setState('activating')

    try {
      // Verificar si email ya existe (puede fallar si la tabla no existe)
      try {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (existing) {
          toast.error('Este email ya tiene cuenta. Inicia sesión.')
          setHasExistingAccount(true)
          setState('login')
          return
        }
      } catch (checkErr) {
        console.log('User check failed (non-critical)')
      }

      // Crear cuenta en Supabase Auth
      const finalPassword = password || `Bear${Math.random().toString(36).slice(2, 10)}!`
      
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password: finalPassword,
        options: {
          data: { name, phone },
        },
      })

      if (signupError) throw signupError

      const userId = authData.user!.id
      const normalizedPhone = normalizePhoneNumber(phone, country) || phone

      // Guardar credenciales para mostrar al usuario
      setGeneratedCredentials({ email, password: finalPassword })

      // Crear usuario en tabla (puede fallar si la tabla no existe)
      try {
        await supabase.from('users').insert({
          id: userId,
          email,
          name,
          phone: normalizedPhone,
          country_code: country,
        })
      } catch (insertErr) {
        console.log('User insert failed (non-critical):', insertErr)
      }

      // Iniciar sesión automáticamente
      await supabase.auth.signInWithPassword({
        email,
        password: finalPassword,
      })

      await activatePurchase(userId)
      
    } catch (err: any) {
      console.error('Register error:', err)
      toast.error(err.message || 'Error al crear cuenta')
      setState('form')
    }
  }

  // Activar compra para usuario YA LOGUEADO
  const activatePurchaseForLoggedUser = async (userId: string, purchaseInfo: any) => {
    try {
      // Activar compra en el servidor (crea FTP real en Hetzner si está configurado)
      try {
        const activateRes = await fetch('/api/complete-purchase/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId,
            email: email || purchaseInfo.customer_email,
            name: purchaseInfo.customer_name,
            phone: phone || purchaseInfo.customer_phone,
          }),
        })
        const activateData = await activateRes.json().catch(() => ({}))
        if (!activateRes.ok) {
          throw new Error(activateData?.error || 'Error al activar compra')
        }
        if (activateData.ftp_username) {
          setFtpCredentials({
            ftp_username: activateData.ftp_username,
            ftp_password: activateData.ftp_password,
            ftp_host: activateData.ftp_host,
          })
        }
      } catch (dbErr) {
        console.log('Activate API failed (may already exist):', dbErr)
      }

      // Tracking: ManyChat + Facebook Pixel Purchase (valor real para conversiones)
      try {
        await trackPurchaseWithManyChat({
          email: email || purchaseInfo.customer_email || '',
          phone: phone || '',
          packName: purchaseInfo?.pack?.name || 'Pack',
          amount: purchaseInfo?.amount_paid || 350,
          currency: purchaseInfo?.currency || 'MXN',
          paymentMethod: 'card',
        })
        trackPaymentSuccess(
          userId,
          purchaseInfo?.pack_id || 1,
          purchaseInfo?.amount_paid ?? 350,
          purchaseInfo?.pack?.name,
          purchaseInfo?.currency || 'MXN',
          email || purchaseInfo?.customer_email,
          phone
        )
      } catch (trackErr) {
        console.log('Tracking error (non-critical):', trackErr)
      }

      // Guardar datos de acceso para mostrar (aunque ya tiene cuenta)
      setGeneratedCredentials({ 
        email: email || purchaseInfo.customer_email || '', 
        password: '(tu contraseña actual)' 
      })

      setState('done')
      
    } catch (err: any) {
      console.error('Activation error:', err)
      toast.error('Error al activar. Contacta soporte.')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  // Activar la compra
  const activatePurchase = async (userId: string) => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone, country) || phone

      // Activar compra en el servidor (crea FTP real en Hetzner si está configurado)
      try {
        const activateRes = await fetch('/api/complete-purchase/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId,
            email,
            name,
            phone: normalizedPhone,
          }),
        })
        const activateData = await activateRes.json().catch(() => ({}))
        if (!activateRes.ok) {
          throw new Error(activateData?.error || 'Error al activar compra')
        }
        if (activateData.ftp_username) {
          setFtpCredentials({
            ftp_username: activateData.ftp_username,
            ftp_password: activateData.ftp_password,
            ftp_host: activateData.ftp_host,
          })
        }
      } catch (dbErr) {
        console.log('Activate API failed (may already exist):', dbErr)
      }

      // Sincronizar ManyChat (puede fallar si no está configurado)
      try {
        const nameParts = name.split(' ')
        await syncUserWithManyChat({
          email,
          phone: normalizedPhone,
          firstName: nameParts[0] || name,
          lastName: nameParts.slice(1).join(' ') || '',
          country,
          userId,
        })

        await trackPurchaseWithManyChat({
          email,
          phone: normalizedPhone,
          packName: purchaseData?.pack?.name || 'Pack',
          amount: purchaseData?.amount_paid || 350,
          currency: purchaseData?.currency || 'MXN',
          paymentMethod: (purchaseData?.payment_provider || 'card') as any,
        })
      } catch (trackErr) {
        console.log('Tracking error (non-critical):', trackErr)
      }

      setUserTrackingInfo(email, normalizedPhone)
      
      if (hasExistingAccount) {
        trackLogin(userId, email, normalizedPhone)
      } else {
        trackRegistration(userId, 'email', email, normalizedPhone)
      }

      // Facebook Pixel Purchase con valor real
      trackPaymentSuccess(
        userId,
        purchaseData?.pack_id || 1,
        purchaseData?.amount_paid ?? 350,
        purchaseData?.pack?.name,
        purchaseData?.currency || 'MXN',
        email,
        normalizedPhone
      )

      setState('done')
      
    } catch (err: any) {
      console.error('Activation error:', err)
      toast.error('Error al activar. Contacta soporte.')
      setState('form')
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* Header */}
      <header className="py-4 px-4 border-b border-bear-blue/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
          
          {/* Progress */}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">✓</span>
            <span className="text-green-400 font-bold">Pago</span>
            <span className="text-gray-600">→</span>
            <span className="w-6 h-6 bg-bear-blue text-bear-black rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <span className="text-bear-blue font-bold">Acceso</span>
          </div>
        </div>
      </header>

      <main className="py-8 px-4">
        <div className="max-w-xl mx-auto">
          
          {/* ==================== LOADING ==================== */}
          {state === 'loading' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 border-4 border-bear-blue border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-2">Verificando tu pago...</h2>
              <p className="text-gray-400">Esto solo toma unos segundos</p>
            </motion.div>
          )}

          {/* ==================== SUCCESS ==================== */}
          {state === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-8xl mb-6"
              >
                🎉
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black text-green-400 mb-4">
                ¡Pago Recibido!
              </h1>
              <p className="text-xl text-gray-300 mb-2">
                ${purchaseData?.amount_paid} {purchaseData?.currency}
              </p>
              <p className="text-gray-400">
                {purchaseData?.pack?.name}
              </p>
              <div className="mt-8 flex justify-center gap-2">
                <div className="w-2 h-2 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {/* ==================== FORM (Nuevo Usuario) ==================== */}
          {state === 'form' && !hasExistingAccount && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Success badge */}
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 text-center">
                <p className="text-green-400 font-bold">✅ Pago confirmado: ${purchaseData?.amount_paid} {purchaseData?.currency}</p>
              </div>

              <h2 className="text-2xl font-black text-center mb-2">
                Último paso: Crea tu acceso
              </h2>
              <p className="text-gray-400 text-center mb-8">
                Completa estos datos para poder descargar
              </p>

              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2">📧 Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border-2 border-bear-blue/30 rounded-xl focus:border-bear-blue focus:outline-none text-lg"
                    placeholder="tu@email.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Te enviaremos tu acceso aquí</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">👤 Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border-2 border-bear-blue/30 rounded-xl focus:border-bear-blue focus:outline-none text-lg"
                    placeholder="Tu nombre"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">📱 WhatsApp</label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    onCountryChange={setCountry}
                    defaultCountry={country}
                  />
                  <p className="text-xs text-gray-500 mt-1">Para enviarte información de tu compra</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">🔐 Crea tu contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border-2 border-bear-blue/30 rounded-xl focus:border-bear-blue focus:outline-none text-lg pr-12"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">🔐 Confirma tu contraseña</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/5 border-2 rounded-xl focus:outline-none text-lg ${
                      confirmPassword && password !== confirmPassword 
                        ? 'border-red-500' 
                        : confirmPassword && password === confirmPassword
                        ? 'border-green-500'
                        : 'border-bear-blue/30 focus:border-bear-blue'
                    }`}
                    placeholder="Repite tu contraseña"
                    required
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-400 mt-1">✓ Contraseñas coinciden</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!password || password.length < 6 || password !== confirmPassword}
                  className="w-full bg-bear-blue text-bear-black font-black text-xl py-4 rounded-xl hover:bg-bear-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ACTIVAR MI ACCESO →
                </button>
              </form>

              {hasExistingAccount && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setState('login')}
                    className="text-bear-blue hover:underline text-sm"
                  >
                    ¿Ya tienes cuenta? Inicia sesión
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== FORM (Usuario Existente) ==================== */}
          {(state === 'form' && hasExistingAccount) || state === 'login' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Success badge */}
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 text-center">
                <p className="text-green-400 font-bold">✅ Pago confirmado: ${purchaseData?.amount_paid} {purchaseData?.currency}</p>
              </div>

              <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-6 text-center">
                <p className="text-blue-400 font-bold">Este email ya tiene cuenta</p>
                <p className="text-blue-300 text-sm">Inicia sesión para activar tu compra</p>
              </div>

              <h2 className="text-2xl font-black text-center mb-8">
                Inicia sesión
              </h2>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2">📧 Email</label>
                  <input
                    type="email"
                    value={email}
                    className="w-full px-4 py-3 bg-white/10 border-2 border-gray-600 rounded-xl text-lg"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">🔑 Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border-2 border-bear-blue/30 rounded-xl focus:border-bear-blue focus:outline-none text-lg"
                    placeholder="Tu contraseña"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-bear-blue text-bear-black font-black text-xl py-4 rounded-xl hover:bg-bear-blue/90 transition-colors"
                >
                  INICIAR SESIÓN Y ACTIVAR →
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setHasExistingAccount(false)
                    setState('form')
                  }}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Usar otro email
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ==================== ACTIVATING ==================== */}
          {state === 'activating' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 border-4 border-bear-blue border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">Activando tu acceso...</h2>
              <p className="text-gray-400">Esto solo toma unos segundos</p>
            </motion.div>
          )}

          {/* ==================== DONE – Página de éxito post-pago ==================== */}
          {state === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 max-w-lg mx-auto"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-7xl mb-4">🎉</motion.div>
              <h1 className="text-2xl md:text-3xl font-black text-green-400 mb-2">
                ¡Pago confirmado! Tu acceso está listo
              </h1>
              <p className="text-gray-400 mb-8">Elige cómo quieres descargar</p>

              {/* Opción A: Descargar por Web (principal) */}
              <Link href="/contenido" className="block mb-4">
                <button className="w-full bg-bear-blue text-bear-black font-black text-xl py-5 rounded-2xl hover:bg-bear-blue/90 transition-colors shadow-lg">
                  🌐 Descargar por Web
                </button>
              </Link>
              <p className="text-xs text-gray-500 mb-6">Video a video desde el navegador</p>

              {/* Opción B: Datos FTP (acordeón) */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowFtpAccordion(!showFtpAccordion)}
                  className="w-full bg-white/5 border-2 border-bear-blue/40 text-white font-bold py-4 px-4 rounded-2xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  📁 Datos FTP
                  <span className="text-xl">{showFtpAccordion ? '▲' : '▼'}</span>
                </button>
                {showFtpAccordion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 bg-black/40 rounded-xl p-4 text-left overflow-hidden"
                  >
                    {ftpCredentials?.ftp_username ? (
                      <>
                        <p className="text-xs text-gray-400 mb-3">Guarda estos datos por si el email tarda en llegar:</p>
                        <div className="space-y-3 text-sm">
                          <div className="flex flex-wrap gap-2 items-center justify-between">
                            <span className="text-gray-500 shrink-0">Host:</span>
                            <span className="font-mono text-white break-all flex-1 min-w-0">{ftpCredentials.ftp_host || `${ftpCredentials.ftp_username}.your-storagebox.de`}</span>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(ftpCredentials.ftp_host || ''); toast.success('Copiado') }} className="text-bear-blue text-xs font-bold shrink-0">Copiar</button>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center justify-between">
                            <span className="text-gray-500 shrink-0">Usuario:</span>
                            <span className="font-mono text-white flex-1 min-w-0">{ftpCredentials.ftp_username}</span>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(ftpCredentials.ftp_username); toast.success('Copiado') }} className="text-bear-blue text-xs font-bold shrink-0">Copiar</button>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center justify-between">
                            <span className="text-gray-500 shrink-0">Contraseña:</span>
                            <span className="font-mono text-white flex-1 min-w-0 truncate">{ftpCredentials.ftp_password}</span>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(ftpCredentials.ftp_password || ''); toast.success('Copiado') }} className="text-bear-blue text-xs font-bold shrink-0">Copiar</button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400 text-sm">Tus credenciales FTP llegarán por email. También las verás en tu panel.</p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Cuenta: ALERTA VISUAL para usuario nuevo (contraseña autogenerada) */}
              {generatedCredentials?.password && generatedCredentials.password !== '(tu contraseña actual)' ? (
                <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-xl p-5 text-left mb-4">
                  <p className="text-amber-400 font-bold text-sm mb-1">🔐 Guarda estos datos</p>
                  <p className="text-xs text-gray-400 mb-3">También te los enviamos por email.</p>
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Email</p>
                      <p className="text-white font-mono text-sm break-all">{generatedCredentials.email || email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Contraseña</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-white text-sm bg-black/30 px-2 py-1 rounded flex-1 min-w-0 truncate">{generatedCredentials.password}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedCredentials.password)
                            toast.success('Contraseña copiada al portapapeles')
                          }}
                          className="bg-bear-blue text-bear-black font-black text-sm px-4 py-2 rounded-lg shrink-0"
                        >
                          Copiar Contraseña
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-amber-200/90">Si cierras esta pestaña sin copiarla, podrás recuperar el acceso por email. Guárdala para entrar cuando quieras.</p>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left mb-4">
                  <p className="text-gray-400 font-bold text-sm mb-1">🔐 Tu cuenta</p>
                  <p className="text-xs text-gray-500">Email: <span className="text-white font-mono break-all">{generatedCredentials?.email || email}</span></p>
                </div>
              )}

              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-bear-blue">
                Ir a Mi Panel →
              </Link>
            </motion.div>
          )}

          {/* ==================== ERROR ==================== */}
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-6">😕</div>
              <h2 className="text-2xl font-bold mb-4">Algo salió mal</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <p className="text-sm text-yellow-400 mb-6">¿Qué puedes hacer? Intenta con OXXO o SPEI desde el checkout, o contacta soporte con tu email de pago.</p>
              <div className="space-y-3">
                <Link 
                  href="/checkout?pack=enero-2026"
                  className="block w-full bg-bear-blue text-bear-black font-bold py-3 rounded-xl"
                >
                  Volver a pagar (OXXO / SPEI / Tarjeta)
                </Link>
                <Link href="/" className="block w-full bg-white/10 text-white font-bold py-3 rounded-xl text-center">
                  Volver al inicio
                </Link>
                <a 
                  href="mailto:soporte@bearbeat.com"
                  className="block w-full bg-white/10 text-white font-bold py-3 rounded-xl text-center"
                >
                  Contactar soporte
                </a>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/10 text-center text-sm text-gray-500">
        <p>¿Problemas? <a href="mailto:soporte@bearbeat.com" className="text-bear-blue hover:underline">soporte@bearbeat.com</a></p>
      </footer>
    </div>
  )
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
