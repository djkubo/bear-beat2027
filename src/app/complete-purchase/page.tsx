'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check, Copy, ExternalLink, Lock } from 'lucide-react'
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
import { getMessengerUrl } from '@/config/contact'

// ==========================================
// EMBUDO - COMPLETAR COMPRA (POST-PAGO)
// ==========================================

type PageState = 'loading' | 'success' | 'form' | 'login' | 'activating' | 'done' | 'error'

export default function CompletePurchasePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const sessionId = searchParams.get('session_id')
  const paymentIntentId = searchParams.get('payment_intent')
  const provider = searchParams.get('provider')
  const emailFromUrl = searchParams.get('email')
  
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
  const [emailFromPayment, setEmailFromPayment] = useState(false) // true = email vino del pago o URL, input readOnly
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null)
  const [ftpCredentials, setFtpCredentials] = useState<{ ftp_username?: string; ftp_password?: string; ftp_host?: string } | null>(null)
  const [showFtpAccordion, setShowFtpAccordion] = useState(false)
  const confettiFired = useRef(false)
  const checkEmailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Confeti al entrar en estado "done" (una sola vez)
  useEffect(() => {
    if (state !== 'done' || confettiFired.current) return
    confettiFired.current = true
    const colors = ['#22d3ee', '#ffffff', '#eab308', '#0ea5e9']
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    })
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.7 },
        colors,
      })
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 0.8, y: 0.7 },
        colors,
      })
    }, 200)
  }, [state])

  // Auto-fill email desde URL (checkout puede pasar ?email=...)
  useEffect(() => {
    if (emailFromUrl && typeof emailFromUrl === 'string') {
      try {
        const decoded = decodeURIComponent(emailFromUrl.trim())
        if (decoded.includes('@')) {
          setEmail(decoded)
          setEmailFromPayment(true)
        }
      } catch (_) {}
    }
  }, [emailFromUrl])

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (checkEmailTimeoutRef.current) clearTimeout(checkEmailTimeoutRef.current)
    }
  }, [])

  // Cargar datos de la compra (session_id para Stripe Checkout/PayPal, payment_intent para Stripe Elements)
  useEffect(() => {
    if (!sessionId && !paymentIntentId) {
      setError('No se encontró la sesión de pago')
      setState('error')
      return
    }
    
    loadPurchaseData()
  }, [sessionId, paymentIntentId, provider])

  const loadPurchaseData = async () => {
    try {
      // PRIMERO: Verificar si el usuario ya está logueado
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      // Verificar pago (Stripe Checkout, Stripe PaymentIntent o PayPal)
      const verifyUrl = paymentIntentId
        ? `/api/verify-payment?payment_intent=${encodeURIComponent(paymentIntentId)}`
        : provider === 'paypal' && sessionId
          ? `/api/verify-payment?session_id=${encodeURIComponent(sessionId)}&provider=paypal`
          : `/api/verify-payment?session_id=${encodeURIComponent(sessionId!)}`
      const stripeRes = await fetch(verifyUrl)
      const stripeData = await stripeRes.json()
      
      if (stripeRes.ok && stripeData.success) {
        const purchaseInfo = {
          stripe_session_id: sessionId || paymentIntentId,
          pack_id: stripeData.packId || 1,
          pack: stripeData.pack || { name: 'Pack Enero 2026' },
          amount_paid: stripeData.amount,
          currency: stripeData.currency?.toUpperCase() || 'MXN',
          payment_provider: provider === 'paypal' ? 'paypal' : 'stripe',
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
        
        // Si no está logueado, mostrar formulario (email del pago = readOnly)
        if (stripeData.customerEmail) {
          setEmail(stripeData.customerEmail)
          setEmailFromPayment(true)
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
            setEmailFromPayment(true)
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
      const { data, error: qError } = await supabase
        .from('users')
        .select('id')
        .eq('email', checkEmail)
        .maybeSingle()
      if (qError) {
        setHasExistingAccount(false)
        return
      }
      setHasExistingAccount(!!data)
    } catch {
      setHasExistingAccount(false)
    }
  }

  // Debounce validación de email para evitar 406 / spam a Supabase
  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail)
    if (checkEmailTimeoutRef.current) {
      clearTimeout(checkEmailTimeoutRef.current)
      checkEmailTimeoutRef.current = null
    }
    if (!newEmail.includes('@') || newEmail.length < 6) {
      setHasExistingAccount(false)
      return
    }
    checkEmailTimeoutRef.current = setTimeout(() => {
      checkEmailTimeoutRef.current = null
      checkExistingAccount(newEmail)
    }, 500)
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
      const finalPassword = password || `Bear${Math.random().toString(36).slice(2, 10)}!`
      const normalizedPhone = normalizePhoneNumber(phone, country) || phone

      // Verificar si email ya existe en tabla users (evitar conflicto con webhook)
      try {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        if (existing?.id) {
          toast.error('Este email ya tiene cuenta. Inicia sesión con tu contraseña.')
          setHasExistingAccount(true)
          setState('login')
          return
        }
      } catch (_) {}

      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password: finalPassword,
        options: { data: { name, phone } },
      })

      // Usuario ya registrado (p. ej. creado por webhook) → pedir login
      if (signupError) {
        const msg = (signupError.message || '').toLowerCase()
        if (msg.includes('already') || msg.includes('registered') || msg.includes('already been') || signupError.status === 422) {
          toast.info('Tu cuenta ya existe. Inicia sesión con tu contraseña o usa "¿Olvidaste contraseña?" para crear una.')
          setHasExistingAccount(true)
          setState('login')
          return
        }
        throw signupError
      }

      const userId = authData.user!.id
      setGeneratedCredentials({ email, password: finalPassword })

      // Upsert en tabla users para evitar 409 si el webhook ya insertó
      try {
        await supabase.from('users').upsert(
          { id: userId, email, name, phone: normalizedPhone, country_code: country },
          { onConflict: 'id' }
        )
      } catch (upsertErr) {
        console.log('User upsert failed (non-critical):', upsertErr)
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
            sessionId: purchaseInfo.stripe_session_id,
            userId,
            email: email || purchaseInfo.customer_email,
            name: purchaseInfo.customer_name,
            phone: phone || purchaseInfo.customer_phone,
            ...(purchaseInfo.payment_provider === 'paypal' && {
              packId: purchaseInfo.pack_id,
              amountPaid: purchaseInfo.amount_paid,
              currency: purchaseInfo.currency,
              paymentProvider: 'paypal',
            }),
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
            sessionId: purchaseData?.stripe_session_id || sessionId,
            userId,
            email,
            name,
            phone: normalizedPhone,
            ...(purchaseData?.payment_provider === 'paypal' && purchaseData && {
              packId: purchaseData.pack_id,
              amountPaid: purchaseData.amount_paid,
              currency: purchaseData.currency,
              paymentProvider: 'paypal',
            }),
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
                    readOnly={emailFromPayment}
                    onChange={(e) => !emailFromPayment && handleEmailChange(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl text-lg focus:outline-none ${
                      emailFromPayment
                        ? 'bg-white/5 border-2 border-zinc-600 text-gray-300 cursor-default'
                        : 'bg-white/5 border-2 border-bear-blue/30 focus:border-bear-blue'
                    }`}
                    placeholder="tu@email.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {emailFromPayment ? 'Email de tu compra (no editable)' : 'Te enviaremos tu acceso aquí'}
                  </p>
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

              <div className="mt-4 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  ¿No recuerdas tu contraseña?{' '}
                  <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="text-bear-blue hover:underline">
                    Crear o restablecer contraseña
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHasExistingAccount(false)
                    setState('form')
                  }}
                  className="block w-full text-gray-400 hover:text-white text-sm"
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

          {/* ==================== DONE – Página de éxito post-pago (Efecto WOW) ==================== */}
          {state === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="py-8 max-w-2xl mx-auto text-center"
            >
              {/* Header de éxito: checkmark animado + título + subtítulo recibo */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-400 mb-6"
              >
                <Check className="w-14 h-14 text-cyan-400" strokeWidth={2.5} />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                ¡Todo listo! Eres oficialmente parte de Bear Beat.
              </h1>
              <p className="text-zinc-400 text-lg mb-10">
                Hemos enviado tu recibo a <strong className="text-white">{generatedCredentials?.email || email}</strong>.
              </p>

              {/* User Badge: Avatar (iniciales) + Email + Miembro PRO */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-3 mb-10"
              >
                <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {(generatedCredentials?.email || email || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-zinc-300 font-mono text-sm truncate max-w-[180px]">{generatedCredentials?.email || email}</span>
                  <span className="bg-gradient-to-r from-amber-500/90 to-cyan-500/90 text-black text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                    Miembro PRO
                  </span>
                </div>
              </motion.div>

              {/* Opción A: CTA Biblioteca (Web) – tarjeta destacada */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <p className="text-zinc-400 text-sm mb-3">Quiero descargar video por video</p>
                <Link href="/contenido" className="block">
                  <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg py-5 rounded-2xl transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/30 flex items-center justify-center gap-2">
                    IR A LA BIBLIOTECA (WEB) <ExternalLink className="w-5 h-5" />
                  </button>
                </Link>
              </motion.div>

              {/* Opción B: Credenciales FTP – estilo developer */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <button
                  type="button"
                  onClick={() => setShowFtpAccordion(!showFtpAccordion)}
                  className="w-full bg-zinc-950 border border-zinc-700/60 text-zinc-300 font-bold py-4 px-4 rounded-xl hover:bg-zinc-900/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-cyan-500" />
                  Credenciales FTP Privadas
                  <span className="text-lg text-cyan-500">{showFtpAccordion ? '▲' : '▼'}</span>
                </button>
                {showFtpAccordion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 bg-zinc-950 border border-cyan-500/30 rounded-xl p-5 text-left overflow-hidden"
                  >
                    <p className="text-zinc-500 text-xs mb-4">Guarda estos datos en un lugar seguro.</p>
                    {ftpCredentials?.ftp_username ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-500 text-xs font-mono w-16 shrink-0">Host</span>
                          <span className="font-mono text-cyan-300 text-sm break-all flex-1 min-w-0">{ftpCredentials.ftp_host || `${ftpCredentials.ftp_username}.your-storagebox.de`}</span>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(ftpCredentials.ftp_host || ''); toast.success('Copiado') }} className="p-1.5 rounded text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 shrink-0"><Copy className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-500 text-xs font-mono w-16 shrink-0">User</span>
                          <span className="font-mono text-cyan-300 text-sm flex-1 min-w-0">{ftpCredentials.ftp_username}</span>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(ftpCredentials.ftp_username ?? ''); toast.success('Copiado') }} className="p-1.5 rounded text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 shrink-0"><Copy className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-500 text-xs font-mono w-16 shrink-0">Pass</span>
                          <span className="font-mono text-cyan-300 text-sm truncate flex-1 min-w-0">{ftpCredentials.ftp_password}</span>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(ftpCredentials.ftp_password || ''); toast.success('Copiado') }} className="p-1.5 rounded text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 shrink-0"><Copy className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm">Tus credenciales FTP llegarán por email. También las verás en tu panel.</p>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* Contraseña autogenerada (solo si es usuario nuevo) */}
              {generatedCredentials?.password && generatedCredentials.password !== '(tu contraseña actual)' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-left mb-6"
                >
                  <p className="text-amber-400 font-bold text-sm mb-2">🔐 Guarda estos datos</p>
                  <p className="text-zinc-400 text-xs mb-3">También te los enviamos por email.</p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs w-14">Email</span>
                      <span className="font-mono text-white text-sm break-all flex-1">{generatedCredentials.email || email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs w-14">Contraseña</span>
                      <span className="font-mono text-white text-sm bg-black/30 px-2 py-1 rounded flex-1 truncate">{generatedCredentials.password}</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(generatedCredentials.password); toast.success('Copiado') }} className="p-1.5 rounded text-zinc-500 hover:text-cyan-400"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-amber-200/80 text-xs">Si cierras sin copiarla, podrás recuperar el acceso por email.</p>
                </motion.div>
              )}

              <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors">
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
                  href={getMessengerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-white/10 text-white font-bold py-3 rounded-xl text-center inline-flex items-center justify-center gap-2"
                >
                  <span aria-hidden>💬</span> Ayuda en línea
                </a>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/10 text-center text-sm text-gray-500">
        <p>¿Problemas? <a href={getMessengerUrl()} target="_blank" rel="noopener noreferrer" className="text-bear-blue hover:underline inline-flex items-center gap-1"><span aria-hidden>💬</span> Ayuda en línea</a></p>
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
