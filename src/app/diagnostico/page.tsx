'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DiagnosticoPage() {
  const [info, setInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verificar()
  }, [])

  const verificar = async () => {
    const supabase = createClient()
    const result: any = {}

    try {
      // 1. Auth
      const { data: { user } } = await supabase.auth.getUser()
      result.auth = {
        logueado: !!user,
        email: user?.email || 'No',
        id: user?.id || 'No'
      }

      if (user) {
        // 2. Perfil
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        result.perfil = {
          existe: !!profile,
          nombre: profile?.name || 'No encontrado',
          role: profile?.role || 'NO TIENE',
          error: profileError?.message || 'Ninguno'
        }

        // 3. Compras
        const { data: purchases, error: purchaseError } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', user.id)

        result.compras = {
          total: purchases?.length || 0,
          lista: purchases || [],
          error: purchaseError?.message || 'Ninguno'
        }

        // 4. Decisión final
        result.conclusion = {
          esAdmin: profile?.role === 'admin',
          tieneAcceso: purchases && purchases.length > 0,
          deberiaVerPortal: profile?.role === 'admin' || (purchases && purchases.length > 0)
        }
      }

    } catch (error: any) {
      result.errorGeneral = error.message
    }

    setInfo(result)
    setLoading(false)
  }

  if (loading) {
    return <div style={{ padding: '40px', background: '#000', color: '#fff', minHeight: '100vh' }}>
      <h1>Cargando...</h1>
    </div>
  }

  return (
    <div style={{ padding: '40px', background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>🔍 DIAGNÓSTICO</h1>
      
      <div style={{ background: '#111', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ color: '#0f0', marginBottom: '10px' }}>RESULTADO:</h2>
        {info?.conclusion && (
          <div style={{ fontSize: '20px', marginBottom: '20px' }}>
            {info.conclusion.esAdmin && <div style={{ color: '#0f0' }}>✅ ERES ADMIN</div>}
            {info.conclusion.tieneAcceso && <div style={{ color: '#0f0' }}>✅ TIENES ACCESO (compras: {info.compras.total})</div>}
            {!info.conclusion.tieneAcceso && <div style={{ color: '#f00' }}>❌ NO TIENES ACCESO</div>}
          </div>
        )}
        <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{JSON.stringify(info, null, 2)}</pre>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={verificar} style={{ padding: '10px 20px', background: '#08E1F7', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔄 Verificar Otra Vez
        </button>
        <a href="/" style={{ padding: '10px 20px', background: '#333', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          ← Home
        </a>
        <a href="/admin/dashboard" style={{ padding: '10px 20px', background: '#0a0', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          🎛️ Admin
        </a>
      </div>
    </div>
  )
}
