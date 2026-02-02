'use client'

import { useState, useEffect } from 'react'
import { parsePhoneNumber, CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onCountryChange?: (country: CountryCode) => void
  defaultCountry?: CountryCode
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

export function PhoneInput({
  value,
  onChange,
  onCountryChange,
  defaultCountry = 'MX',
  className = '',
  placeholder = '55 1234 5678',
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry)
  const [phoneNumber, setPhoneNumber] = useState('')

  useEffect(() => {
    // Detectar país por IP al montar
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const detectedCountry = data.country_code as CountryCode
        if (countryNames[detectedCountry]) {
          setCountry(detectedCountry)
          onCountryChange?.(detectedCountry)
        }
      })
      .catch(() => {
        // Default a México si falla
        setCountry('MX')
      })
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
    } catch (error) {
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
    <div className="flex gap-2">
      {/* Selector de país – Dark Mode coherente con formularios (zinc-800, bear-blue focus) */}
      <div className="relative">
        <select
          value={country}
          onChange={handleCountryChange}
          className="appearance-none w-32 px-3 py-3 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-bear-blue/20 focus:border-bear-blue text-base font-medium bg-black text-white cursor-pointer focus:outline-none transition-colors"
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

      {/* Input de teléfono */}
      <div className="flex-1 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none text-sm">
          +{callingCode}
        </div>
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          className={`w-full pl-14 pr-4 py-3 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-bear-blue/20 focus:border-bear-blue text-base bg-black text-white placeholder-gray-600 focus:outline-none transition-colors ${className}`}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}
