'use client'

import { useState, useEffect } from 'react'
import { parsePhoneNumber, CountryCode, getCountryCallingCode } from 'libphonenumber-js'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onCountryChange?: (country: CountryCode) => void
  defaultCountry?: CountryCode
  autoDetectCountry?: boolean
  className?: string
  placeholder?: string
}

const countryNames: Record<string, string> = {
  'MX': 'México',
  'US': 'Estados Unidos',
  'ES': 'España',
  'CO': 'Colombia',
  'AR': 'Argentina',
  'CL': 'Chile',
  'PE': 'Perú',
  'VE': 'Venezuela',
  'EC': 'Ecuador',
  'GT': 'Guatemala',
  'DO': 'Rep. Dominicana',
  'CR': 'Costa Rica',
  'PA': 'Panamá',
  'UY': 'Uruguay',
  'BO': 'Bolivia',
  'PY': 'Paraguay',
}

const countryFlags: Record<string, string> = {
  'MX': '🇲🇽',
  'US': '🇺🇸',
  'ES': '🇪🇸',
  'CO': '🇨🇴',
  'AR': '🇦🇷',
  'CL': '🇨🇱',
  'PE': '🇵🇪',
  'VE': '🇻🇪',
  'EC': '🇪🇨',
  'GT': '🇬🇹',
  'DO': '🇩🇴',
  'CR': '🇨🇷',
  'PA': '🇵🇦',
  'UY': '🇺🇾',
  'BO': '🇧🇴',
  'PY': '🇵🇾',
}

/** Convierte E.164 a formato nacional para mostrar en el input (ej: +525512345678 → 55 1234 5678) */
function e164ToDisplay(e164: string, country: CountryCode): string {
  if (!e164 || !e164.startsWith('+')) return ''
  try {
    const parsed = parsePhoneNumber(e164, country)
    return parsed ? parsed.formatNational().replace(/\s/g, ' ').trim() : e164.replace(/^\+\d+/, '').trim() || ''
  } catch {
    const digits = e164.replace(/\D/g, '')
    const code = getCountryCallingCode(country)
    if (digits.startsWith(code)) return digits.slice(code.length).replace(/(\d{2})(?=\d)/g, '$1 ')
    return digits
  }
}

export function PhoneInput({
  value,
  onChange,
  onCountryChange,
  defaultCountry = 'MX',
  autoDetectCountry = true,
  className = '',
  placeholder = 'Número con lada (ej. 55 1234 5678)',
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry)
  const [phoneNumber, setPhoneNumber] = useState('')

  // Sincronizar valor externo (ej. desde complete-purchase) al input mostrado
  useEffect(() => {
    if (!value || !value.startsWith('+')) return
    const display = e164ToDisplay(value, country)
    setPhoneNumber(display)
  }, [value, country])

  useEffect(() => {
    if (!autoDetectCountry) return
    // Evitar llamadas externas por performance/privacidad: inferir por locale del navegador.
    try {
      const locales = [
        typeof navigator !== 'undefined' ? navigator.language : '',
        ...(typeof navigator !== 'undefined' && Array.isArray(navigator.languages) ? navigator.languages : []),
      ].filter(Boolean)
      for (const loc of locales) {
        const m = String(loc).match(/[-_]([A-Za-z]{2})\\b/)
        const cc = m?.[1]?.toUpperCase()
        if (cc && countryNames[cc]) {
          const detected = cc as CountryCode
          setCountry(detected)
          onCountryChange?.(detected)
          break
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value
    
    // Permitir solo números, espacios, guiones y paréntesis
    input = input.replace(/[^\d\s\-\(\)]/g, '')
    
    setPhoneNumber(input)
    
    // Normalizar al formato E.164
    try {
      const cleaned = input.replace(/[\s\-\(\)]/g, '')
      const callingCode = getCountryCallingCode(country)
      const fullNumber = cleaned.startsWith(callingCode) 
        ? `+${cleaned}` 
        : `+${callingCode}${cleaned}`
      
      const parsed = parsePhoneNumber(fullNumber, country)
      
      if (parsed && parsed.isValid()) {
        onChange(parsed.number) // Formato E.164: +525512345678
      } else {
        onChange(fullNumber)
      }
    } catch (_error) {
      // Si hay error en parseo, devolver lo que escribió el usuario
      onChange(input)
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value as CountryCode
    setCountry(newCountry)
    onCountryChange?.(newCountry)
    
    // Limpiar el número cuando cambia el país
    setPhoneNumber('')
    onChange('')
  }

  const callingCode = getCountryCallingCode(country)

  return (
    <div className="flex gap-3 items-stretch w-full min-w-0">
      {/* Selector de país */}
      <div className="relative shrink-0">
        <select
          value={country}
          onChange={handleCountryChange}
          className="appearance-none w-28 sm:w-32 px-3 py-3 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-bear-blue/20 focus:border-bear-blue text-base font-medium bg-zinc-900 text-white cursor-pointer focus:outline-none transition-colors h-[50px]"
        >
          {Object.keys(countryNames).map((code) => (
            <option key={code} value={code} className="bg-zinc-900 text-white">
              {countryFlags[code]} {code}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">
          ▼
        </div>
      </div>

      {/* Input de teléfono: más ancho, números tabulares para que no se vean ensimados */}
      <div className="flex-1 min-w-[140px] sm:min-w-[180px] relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none text-sm whitespace-nowrap">
          +{callingCode}
        </span>
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          className={`w-full min-w-0 pl-[3.25rem] sm:pl-14 pr-4 py-3 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-bear-blue/20 focus:border-bear-blue text-base sm:text-lg bg-zinc-900 text-white placeholder-gray-500 focus:outline-none transition-colors tabular-nums tracking-wide ${className}`}
          placeholder={placeholder}
          style={{ letterSpacing: '0.02em' }}
        />
      </div>
    </div>
  )
}
