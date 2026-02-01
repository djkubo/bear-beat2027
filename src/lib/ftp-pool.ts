/**
 * Pool de cuentas FTP (Hetzner subcuentas read-only).
 * Asigna una cuenta por compra para que cada cliente tenga su propio FTP.
 * Si está configurada la API Robot de Hetzner, crea una subcuenta nueva por pago.
 * Si no, usa el pool (tabla ftp_pool).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createStorageBoxSubaccount } from './hetzner-robot'

const HOST_SUFFIX = process.env.HETZNER_STORAGEBOX_HOST_SUFFIX || '.your-storagebox.de'

/**
 * Asigna una cuenta FTP a una compra.
 * 1) Si HETZNER_ROBOT_* y HETZNER_STORAGEBOX_ID están configurados, crea una subcuenta nueva en Hetzner y la asigna.
 * 2) Si no, toma una cuenta del pool (ftp_pool).
 * Devuelve true si se asignó, false si no.
 */
export async function assignFtpToPurchase(
  supabase: SupabaseClient,
  purchaseId: number
): Promise<boolean> {
  try {
    // Opción 1: Crear subcuenta en Hetzner por API (una por cliente, automático)
    const created = await createStorageBoxSubaccount({ readonly: true })
    if (created) {
      const { error } = await supabase
        .from('purchases')
        .update({
          ftp_username: created.username,
          ftp_password: created.password,
        })
        .eq('id', purchaseId)
      if (error) {
        console.error('FTP: error al guardar credenciales creadas en Hetzner', error)
        return false
      }
      return true
    }

    // Opción 2: Asignar una cuenta del pool (manual: Admin → FTP Pool)
    // Obtener una cuenta libre (evitar race: actualizar solo si sigue in_use = false)
    const { data: row, error: selectError } = await supabase
      .from('ftp_pool')
      .select('id, username, password')
      .eq('in_use', false)
      .limit(1)
      .single()

    if (selectError || !row) {
      console.warn('FTP pool: no hay cuentas disponibles', selectError?.message)
      return false
    }

    // Marcar como usada (solo si sigue libre)
    const { data: updated, error: updatePoolError } = await supabase
      .from('ftp_pool')
      .update({
        in_use: true,
        assigned_at: new Date().toISOString(),
        purchase_id: purchaseId,
      })
      .eq('id', row.id)
      .eq('in_use', false)
      .select('id')
      .single()

    if (updatePoolError || !updated) {
      console.warn('FTP pool: cuenta ya asignada por otra compra (race)', updatePoolError?.message)
      return false
    }

    // Guardar credenciales en la compra
    const { error: updatePurchaseError } = await supabase
      .from('purchases')
      .update({
        ftp_username: row.username,
        ftp_password: row.password,
      })
      .eq('id', purchaseId)

    if (updatePurchaseError) {
      console.error('FTP pool: error al actualizar purchase', updatePurchaseError)
      // Revertir pool
      await supabase.from('ftp_pool').update({ in_use: false, assigned_at: null, purchase_id: null }).eq('id', row.id)
      return false
    }

    return true
  } catch (e) {
    console.error('assignFtpToPurchase error:', e)
    return false
  }
}

/**
 * Host para una cuenta FTP (subcuenta Hetzner).
 * Ej: u540473-sub1 -> u540473-sub1.your-storagebox.de
 */
export function getFtpHostForUsername(username: string): string {
  return username + HOST_SUFFIX
}
