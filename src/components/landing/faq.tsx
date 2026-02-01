'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: '¿Cuánto cuesta?',
      answer: '$350 pesos mexicanos. Pagas UNA SOLA VEZ y ya. NO pagas cada mes.',
      emoji: '💰',
    },
    {
      question: '¿Qué obtengo?',
      answer: '3,000 videos de música para DJs. Son videos que ves en pantallas de fiestas y eventos.',
      emoji: '🎬',
    },
    {
      question: '¿Cómo pago?',
      answer: 'Con tarjeta, PayPal, en OXXO (efectivo) o transferencia bancaria. Tú eliges.',
      emoji: '💳',
    },
    {
      question: '¿Cuándo puedo descargar?',
      answer: 'INMEDIATAMENTE después de pagar. Te llega un email y WhatsApp con tu acceso.',
      emoji: '⚡',
    },
    {
      question: '¿Puedo descargar varias veces?',
      answer: 'SÍ. Descargas las veces que quieras, cuando quieras. Es tuyo para siempre.',
      emoji: '♾️',
    },
    {
      question: '¿Tengo que pagar cada mes?',
      answer: 'NO. Pagas $350 UNA SOLA VEZ. No hay mensualidades. Si sale un pack nuevo el próximo mes, solo lo compras si quieres.',
      emoji: '❌',
    },
    {
      question: '¿Cómo descargo los videos?',
      answer: 'Por internet (como descargar cualquier archivo) o con un programa llamado FileZilla. Te damos instrucciones paso a paso.',
      emoji: '📥',
    },
    {
      question: '¿Es seguro?',
      answer: 'SÍ. Usamos las mismas tecnologías que Netflix y Spotify. Si no te gusta, te devolvemos tu dinero en 7 días.',
      emoji: '🔒',
    },
  ]

  return (
    <section id="faq" className="py-20 px-4 bg-secondary/30">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-extrabold mb-4">
            ¿Tienes dudas?
          </h2>
          <p className="text-2xl font-bold text-bear-blue">
            Las respuestas más simples 👇
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-2 border-bear-blue/30 rounded-xl overflow-hidden bg-card shadow-lg hover:shadow-2xl transition-all"
            >
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-bear-blue/5 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{faq.emoji}</span>
                  <span className="font-bold text-lg pr-4">{faq.question}</span>
                </div>
                <ChevronDown
                  className={`h-6 w-6 flex-shrink-0 transition-transform text-bear-blue ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openIndex === index && (
                <div className="px-6 py-5 border-t-2 border-bear-blue/30 bg-bear-blue/5">
                  <p className="text-lg font-medium leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
