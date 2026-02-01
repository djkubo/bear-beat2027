'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// ==========================================
// PÁGINA DE PAGO PENDIENTE (OXXO/SPEI)
// ==========================================

export default function PagoPendientePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const sessionId = searchParams.get('session_id')
  const method = searchParams.get('method') || 'oxxo'
  
  const [checking, setChecking] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  // Verificar periódicamente si ya se confirmó el pago
  useEffect(() => {
    if (!sessionId) return

    const checkPayment = async () => {
      try {
        const { data } = await supabase
          .from('pending_purchases')
          .select('status')
          .eq('stripe_session_id', sessionId)
          .single()

        if (data?.status === 'awaiting_completion') {
          // Pago confirmado! Redirigir a completar
          setPaymentConfirmed(true)
          setTimeout(() => {
            router.push(`/complete-purchase?session_id=${sessionId}`)
          }, 2000)
        }
      } catch (err) {
        console.error('Error checking payment:', err)
      }
    }

    // Verificar cada 30 segundos
    const interval = setInterval(checkPayment, 30000)
    
    // También verificar al cargar
    checkPayment()

    return () => clearInterval(interval)
  }, [sessionId])

  const handleCheckManually = async () => {
    setChecking(true)
    
    try {
      const { data } = await supabase
        .from('pending_purchases')
        .select('status')
        .eq('stripe_session_id', sessionId)
        .single()

      if (data?.status === 'awaiting_completion') {
        setPaymentConfirmed(true)
        setTimeout(() => {
          router.push(`/complete-purchase?session_id=${sessionId}`)
        }, 1500)
      } else {
        // Aún no confirmado
        setChecking(false)
      }
    } catch (err) {
      setChecking(false)
    }
  }

  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-bear-black text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-3xl font-black text-green-400 mb-4">
            ¡Pago Confirmado!
          </h1>
          <p className="text-gray-400">Redirigiendo...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* Header */}
      <header className="py-4 px-4 border-b border-bear-blue/20">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
        </div>
      </header>

      <main className="py-12 px-4">
        <div className="max-w-xl mx-auto">
          
          {/* Icono del método */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
              method === 'oxxo' ? 'bg-red-500' : 'bg-green-500'
            } text-5xl mb-4`}>
              {method === 'oxxo' ? '🏪' : '🏦'}
            </div>
            <h1 className="text-3xl font-black mb-2">
              {method === 'oxxo' ? '¡Ficha de OXXO Generada!' : '¡Referencia SPEI Lista!'}
            </h1>
            <p className="text-gray-400">
              Tu pago está en proceso
            </p>
          </div>

          {/* Instrucciones */}
          <div className="bg-white/5 border border-bear-blue/30 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-center">
              {method === 'oxxo' ? '¿Qué sigue?' : '¿Qué sigue?'}
            </h2>
            
            <div className="space-y-4">
              {method === 'oxxo' ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">1️⃣</span>
                    <div>
                      <p className="font-bold">Ve a cualquier OXXO</p>
                      <p className="text-sm text-gray-400">Con tu ficha de pago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">2️⃣</span>
                    <div>
                      <p className="font-bold">Dile al cajero que pagas un "servicio"</p>
                      <p className="text-sm text-gray-400">Muestra el código de barras</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">3️⃣</span>
                    <div>
                      <p className="font-bold">Guarda tu ticket</p>
                      <p className="text-sm text-gray-400">Por si lo necesitas después</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">4️⃣</span>
                    <div>
                      <p className="font-bold">Te avisamos cuando esté listo</p>
                      <p className="text-sm text-gray-400">Por email y WhatsApp (1-24 horas)</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">1️⃣</span>
                    <div>
                      <p className="font-bold">Abre tu app del banco</p>
                      <p className="text-sm text-gray-400">O banca en línea</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">2️⃣</span>
                    <div>
                      <p className="font-bold">Haz una transferencia SPEI</p>
                      <p className="text-sm text-gray-400">Con los datos que te dimos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">3️⃣</span>
                    <div>
                      <p className="font-bold">Confirma la transferencia</p>
                      <p className="text-sm text-gray-400">Y guarda tu comprobante</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">4️⃣</span>
                    <div>
                      <p className="font-bold">Te avisamos cuando esté listo</p>
                      <p className="text-sm text-gray-400">Por email y WhatsApp (casi inmediato)</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tiempo estimado */}
          <div className={`rounded-2xl p-4 mb-6 text-center ${
            method === 'oxxo' ? 'bg-orange-500/20 border border-orange-500' : 'bg-green-500/20 border border-green-500'
          }`}>
            <p className={`font-bold ${method === 'oxxo' ? 'text-orange-400' : 'text-green-400'}`}>
              ⏰ Tiempo estimado: {method === 'oxxo' ? '1-24 horas' : '5-30 minutos'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Te enviaremos email y WhatsApp cuando esté listo
            </p>
          </div>

          {/* Botón para verificar */}
          <button
            onClick={handleCheckManually}
            disabled={checking}
            className="w-full bg-bear-blue text-bear-black font-bold py-4 rounded-xl hover:bg-bear-blue/90 transition-colors disabled:opacity-50 mb-4"
          >
            {checking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-bear-black border-t-transparent rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              '¿Ya pagaste? Verificar ahora'
            )}
          </button>

          {/* Nota */}
          <div className="bg-bear-blue/10 border border-bear-blue/30 rounded-xl p-4 text-center text-sm">
            <p className="font-bold mb-1">¿Tienes la ficha/referencia?</p>
            <p className="text-gray-400">
              Te la enviamos por email. Revisa tu bandeja de entrada (y spam).
            </p>
          </div>

          {/* Soporte */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-2">¿Problemas con tu pago?</p>
            <a 
              href="mailto:soporte@bearbeat.com"
              className="text-bear-blue hover:underline text-sm"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
