'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPanelPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [stats, setStats] = useState<any>({})

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login?redirect=/admin-panel')
        return
      }

      setUserEmail(user.email || '')

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('Admin check:', profile)

      if (profile?.role !== 'admin') {
        alert('No eres administrador')
        router.push('/')
        return
      }

      setIsAdmin(true)
      await loadStats()
    } catch (error) {
      console.error('Error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const { data: purchases } = await supabase
        .from('purchases')
        .select('amount_paid')

      const totalPurchases = purchases?.length || 0
      const totalRevenue = purchases?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0

      setStats({
        totalUsers: totalUsers || 0,
        totalPurchases,
        totalRevenue
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #333', borderTop: '4px solid #08E1F7', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
          <p>Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <header style={{ background: '#111', borderBottom: '2px solid #08E1F7', padding: '20px 40px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '5px' }}>🎛️ Panel Admin</h1>
            <p style={{ color: '#888' }}>Bear Beat - Control Total</p>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ color: '#08E1F7' }}>{userEmail}</span>
            <Link href="/">
              <button style={{ padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                ← Volver al Sitio
              </button>
            </Link>
            <button 
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              style={{ padding: '10px 20px', background: '#ff3333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '30px', borderRadius: '16px' }}>
            <span style={{ fontSize: '40px', marginBottom: '10px', display: 'block' }}>👥</span>
            <p style={{ fontSize: '48px', fontWeight: '900', marginBottom: '5px' }}>{stats.totalUsers}</p>
            <p style={{ opacity: 0.9 }}>Usuarios Totales</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '30px', borderRadius: '16px' }}>
            <span style={{ fontSize: '40px', marginBottom: '10px', display: 'block' }}>💰</span>
            <p style={{ fontSize: '48px', fontWeight: '900', marginBottom: '5px' }}>{stats.totalPurchases}</p>
            <p style={{ opacity: 0.9 }}>Ventas Totales</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '30px', borderRadius: '16px' }}>
            <span style={{ fontSize: '40px', marginBottom: '10px', display: 'block' }}>💵</span>
            <p style={{ fontSize: '32px', fontWeight: '900', marginBottom: '5px' }}>${stats.totalRevenue?.toLocaleString() || 0}</p>
            <p style={{ opacity: 0.9 }}>Ingresos (MXN)</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', padding: '30px', borderRadius: '16px' }}>
            <span style={{ fontSize: '40px', marginBottom: '10px', display: 'block' }}>📊</span>
            <p style={{ fontSize: '48px', fontWeight: '900', marginBottom: '5px' }}>
              {stats.totalUsers > 0 ? ((stats.totalPurchases / stats.totalUsers) * 100).toFixed(1) : 0}%
            </p>
            <p style={{ opacity: 0.9 }}>Conversión</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: '#111', padding: '30px', borderRadius: '16px', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '20px' }}>⚡ Accesos Rápidos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <Link href="/admin/usuarios">
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                   onMouseEnter={(e) => e.currentTarget.style.borderColor = '#08E1F7'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>👥</span>
                <p style={{ fontWeight: 'bold' }}>Gestionar Usuarios</p>
              </div>
            </Link>

            <Link href="/admin/ventas">
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                   onMouseEnter={(e) => e.currentTarget.style.borderColor = '#08E1F7'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>💰</span>
                <p style={{ fontWeight: 'bold' }}>Ver Ventas</p>
              </div>
            </Link>

            <Link href="/admin/metricas">
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                   onMouseEnter={(e) => e.currentTarget.style.borderColor = '#08E1F7'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📈</span>
                <p style={{ fontWeight: 'bold' }}>Analytics</p>
              </div>
            </Link>

            <Link href="/admin/mensajes">
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                   onMouseEnter={(e) => e.currentTarget.style.borderColor = '#08E1F7'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>✉️</span>
                <p style={{ fontWeight: 'bold' }}>Enviar Mensajes</p>
              </div>
            </Link>

            <Link href="/diagnostico">
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                   onMouseEnter={(e) => e.currentTarget.style.borderColor = '#08E1F7'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🔍</span>
                <p style={{ fontWeight: 'bold' }}>Diagnóstico</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Info */}
        <div style={{ background: '#111', padding: '30px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px' }}>📊 Resumen Rápido</h3>
          <div style={{ display: 'grid', gap: '10px', fontSize: '14px', color: '#ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
              <span>Total Usuarios:</span>
              <strong style={{ color: '#08E1F7' }}>{stats.totalUsers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
              <span>Total Ventas:</span>
              <strong style={{ color: '#08E1F7' }}>{stats.totalPurchases}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
              <span>Ingresos Totales:</span>
              <strong style={{ color: '#08E1F7' }}>${stats.totalRevenue?.toLocaleString() || 0} MXN</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
              <span>Conversión:</span>
              <strong style={{ color: '#08E1F7' }}>
                {stats.totalUsers > 0 ? ((stats.totalPurchases / stats.totalUsers) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
