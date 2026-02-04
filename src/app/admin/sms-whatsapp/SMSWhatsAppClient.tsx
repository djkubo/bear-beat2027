'use client'

import { useState, useEffect, useCallback } from 'react'

interface ConfigState {
  sms: { configured: boolean; diagnostic: Record<string, string> }
  whatsapp: { configured: boolean; diagnostic: Record<string, string> }
  sms_templates: { id: string; label: string; message: string }[]
  whatsapp_templates: { id: string; label: string; message: string }[]
}

export function SMSWhatsAppClient() {
  const [config, setConfig] = useState<ConfigState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // SMS prueba
  const [smsTo, setSmsTo] = useState('')
  const [smsTemplateId, setSmsTemplateId] = useState('')
  const [smsCustomMessage, setSmsCustomMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [smsResult, setSmsResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // WhatsApp prueba
  const [waTo, setWaTo] = useState('')
  const [waTemplateId, setWaTemplateId] = useState('')
  const [waCustomMessage, setWaCustomMessage] = useState('')
  const [sendingWa, setSendingWa] = useState(false)
  const [waResult, setWaResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sms-whatsapp')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setConfig(null)
        return
      }
      setConfig({
        sms: data.sms,
        whatsapp: data.whatsapp,
        sms_templates: data.sms_templates || [],
        whatsapp_templates: data.whatsapp_templates || [],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const sendSmsTest = async () => {
    const to = smsTo.trim().replace(/\s/g, '')
    if (!to || to.length < 10) {
      setSmsResult({ type: 'err', text: 'Escribe un número (ej. +5215512345678)' })
      return
    }
    const message = smsCustomMessage.trim()
    const templateId = smsTemplateId.trim()
    if (!message && !templateId) {
      setSmsResult({ type: 'err', text: 'Elige una plantilla o escribe un mensaje' })
      return
    }
    setSendingSms(true)
    setSmsResult(null)
    try {
      const res = await fetch('/api/admin/sms-whatsapp/send-sms-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          templateId: templateId || undefined,
          message: message || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSmsResult({
          type: 'ok',
          text: (data.message || 'SMS enviado') + (data.messageId ? ` (ID: ${data.messageId}). Si no llega, revisa en Brevo → SMS → Estadísticas o que el remitente esté aprobado.` : ''),
        })
        setSmsTo('')
        setSmsCustomMessage('')
      } else {
        let msg = data.error || 'Error al enviar'
        if (data.diagnostic) {
          msg += ` — BREVO_API_KEY: ${data.diagnostic.BREVO_API_KEY}; BREVO_SMS_SENDER: ${data.diagnostic.BREVO_SMS_SENDER}`
        }
        if (data.hint) msg += ` (${data.hint})`
        setSmsResult({ type: 'err', text: msg })
      }
    } catch (e) {
      setSmsResult({ type: 'err', text: e instanceof Error ? e.message : 'Error de red' })
    } finally {
      setSendingSms(false)
    }
  }

  const sendWhatsAppTest = async () => {
    const to = waTo.trim().replace(/\s/g, '')
    if (!to || to.length < 10) {
      setWaResult({ type: 'err', text: 'Escribe un número (ej. +5215512345678)' })
      return
    }
    const message = waCustomMessage.trim()
    const templateId = waTemplateId.trim()
    if (!message && !templateId) {
      setWaResult({ type: 'err', text: 'Elige una plantilla o escribe un mensaje' })
      return
    }
    setSendingWa(true)
    setWaResult(null)
    try {
      const res = await fetch('/api/admin/sms-whatsapp/send-whatsapp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          templateId: templateId || undefined,
          message: message || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setWaResult({ type: 'ok', text: data.message || 'WhatsApp enviado' })
        setWaTo('')
        setWaCustomMessage('')
      } else {
        let msg = data.error || 'Error al enviar'
        if (data.diagnostic) {
          msg += ` — ${JSON.stringify(data.diagnostic)}`
        }
        if (data.hint) msg += ` (${data.hint})`
        setWaResult({ type: 'err', text: msg })
      }
    } catch (e) {
      setWaResult({ type: 'err', text: e instanceof Error ? e.message : 'Error de red' })
    } finally {
      setSendingWa(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-8 text-center text-zinc-400">
        Cargando configuración…
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
        {error || 'No se pudo cargar la configuración'}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Diagnóstico SMS (Brevo) */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-6">
        <h2 className="text-xl font-black text-white tracking-tight mb-2">SMS (Brevo)</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Se usa la misma API key que para emails. Variable adicional: <code className="bg-zinc-800 px-1 rounded">BREVO_SMS_SENDER</code> (máx 11 caracteres).
        </p>
        {config.sms.configured ? (
          <p className="text-emerald-400 font-medium">Configurado correctamente</p>
        ) : (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-bold text-amber-300">Brevo SMS no está configurado</p>
            <p className="text-sm text-amber-200/90 mt-1">
              <span className="font-mono">BREVO_API_KEY</span>: {config.sms.diagnostic.BREVO_API_KEY}
              {' · '}
              <span className="font-mono">BREVO_SMS_SENDER</span>: {config.sms.diagnostic.BREVO_SMS_SENDER}
            </p>
          </div>
        )}
      </div>

      {/* Diagnóstico WhatsApp (Twilio) */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-6">
        <h2 className="text-xl font-black text-white tracking-tight mb-2">WhatsApp (Twilio)</h2>
        <p className="text-sm text-zinc-500 mb-4">
          <code className="bg-zinc-800 px-1 rounded">TWILIO_ACCOUNT_SID</code>, <code className="bg-zinc-800 px-1 rounded">TWILIO_AUTH_TOKEN</code> y <strong>uno</strong> de: <code className="bg-zinc-800 px-1 rounded">TWILIO_WHATSAPP_NUMBER</code>, <code className="bg-zinc-800 px-1 rounded">TWILIO_PHONE_NUMBER</code>, <code className="bg-zinc-800 px-1 rounded">TWILIO_WHATSAPP_SENDER</code>, <code className="bg-zinc-800 px-1 rounded">TWILIO_WHATSAPP_FROM</code>, <code className="bg-zinc-800 px-1 rounded">TWILIO_FROM_NUMBER</code>. Valor ej.: <code className="bg-zinc-800 px-1 rounded">whatsapp:+14155238886</code> o <code className="bg-zinc-800 px-1 rounded">+5215512345678</code>.
        </p>
        {config.whatsapp.configured ? (
          <p className="text-emerald-400 font-medium">
            Configurado correctamente
            {(config.whatsapp.diagnostic as Record<string, string>)?.whatsappUsedKey && (
              <span className="text-zinc-500 font-normal"> (usando {(config.whatsapp.diagnostic as Record<string, string>).whatsappUsedKey})</span>
            )}
          </p>
        ) : (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-bold text-amber-300">Twilio WhatsApp: número de envío no detectado</p>
            <p className="text-sm text-amber-200/90 mt-1">
              {Object.entries(config.whatsapp.diagnostic)
                .filter(([k]) => k !== 'whatsappUsedKey')
                .map(([k, v]) => (
                  <span key={k}><span className="font-mono">{k}</span>: {v}{' · '}</span>
                ))}
            </p>
            <p className="text-xs text-zinc-400 mt-2">
              En Render: Dashboard → Environment. Añade <strong>una</strong> variable con el nombre exacto (ej. <code>TWILIO_PHONE_NUMBER</code>) y valor tu número Twilio (ej. <code>+14155238886</code> o <code>whatsapp:+14155238886</code>). Luego ejecuta <code>node scripts/render-set-env.js</code> desde tu repo (con RENDER_API_KEY en .env.local) para subir env y disparar deploy, o haz Manual Deploy en Render.
            </p>
          </div>
        )}
      </div>

      {/* Envío de prueba SMS */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-black text-white tracking-tight">Enviar SMS de prueba</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Número en formato internacional (ej. +5215512345678). Plantilla o mensaje libre.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Número</label>
            <input
              type="tel"
              placeholder="+5215512345678"
              value={smsTo}
              onChange={(e) => setSmsTo(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-bear-blue focus:outline-none focus:ring-1 focus:ring-bear-blue/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Plantilla (opcional)</label>
            <select
              value={smsTemplateId}
              onChange={(e) => setSmsTemplateId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-bear-blue focus:outline-none"
            >
              <option value="">— Sin plantilla (usa mensaje abajo)</option>
              {config.sms_templates.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Mensaje (si no usas plantilla)</label>
            <textarea
              placeholder="Texto del SMS..."
              value={smsCustomMessage}
              onChange={(e) => setSmsCustomMessage(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-bear-blue focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={sendingSms || !config.sms.configured}
            onClick={sendSmsTest}
            className="rounded-lg border border-bear-blue/50 bg-bear-blue/20 px-4 py-2 text-sm font-bold text-bear-blue hover:bg-bear-blue/30 disabled:opacity-50"
          >
            {sendingSms ? 'Enviando…' : 'Enviar SMS'}
          </button>
          {smsResult && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                smsResult.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {smsResult.text}
            </div>
          )}
        </div>
      </div>

      {/* Envío de prueba WhatsApp */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-black text-white tracking-tight">Enviar WhatsApp de prueba</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Número en formato internacional. El número debe tener WhatsApp.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Número</label>
            <input
              type="tel"
              placeholder="+5215512345678"
              value={waTo}
              onChange={(e) => setWaTo(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-bear-blue focus:outline-none focus:ring-1 focus:ring-bear-blue/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Plantilla (opcional)</label>
            <select
              value={waTemplateId}
              onChange={(e) => setWaTemplateId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-bear-blue focus:outline-none"
            >
              <option value="">— Sin plantilla (usa mensaje abajo)</option>
              {config.whatsapp_templates.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Mensaje (si no usas plantilla)</label>
            <textarea
              placeholder="Texto del mensaje..."
              value={waCustomMessage}
              onChange={(e) => setWaCustomMessage(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-bear-blue focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={sendingWa || !config.whatsapp.configured}
            onClick={sendWhatsAppTest}
            className="rounded-lg border border-bear-blue/50 bg-bear-blue/20 px-4 py-2 text-sm font-bold text-bear-blue hover:bg-bear-blue/30 disabled:opacity-50"
          >
            {sendingWa ? 'Enviando…' : 'Enviar WhatsApp'}
          </button>
          {waResult && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                waResult.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {waResult.text}
            </div>
          )}
        </div>
      </div>

      {/* Plantillas definidas (solo referencia) */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-6">
        <h2 className="text-xl font-black text-white tracking-tight mb-2">Plantillas definidas</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Los textos de las plantillas están en el servidor. Para cambiarlos: <code className="bg-zinc-800 px-1 rounded">src/app/api/admin/sms-whatsapp/route.ts</code> (SMS_TEMPLATES y WHATSAPP_TEMPLATES).
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-bold text-zinc-400 mb-2">SMS</p>
            <ul className="space-y-2 text-sm text-zinc-300">
              {config.sms_templates.map((t) => (
                <li key={t.id}><strong className="text-white">{t.label}</strong>: {t.message.slice(0, 50)}…</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-400 mb-2">WhatsApp</p>
            <ul className="space-y-2 text-sm text-zinc-300">
              {config.whatsapp_templates.map((t) => (
                <li key={t.id}><strong className="text-white">{t.label}</strong>: {t.message.slice(0, 50)}…</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
