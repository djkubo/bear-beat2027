-- =====================================================
-- POOL DE CUENTAS FTP (una por cliente que paga)
-- Crear subcuentas en Hetzner Console (read-only) y añadirlas aquí
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ftp_pool (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  in_use BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ,
  purchase_id INT REFERENCES public.purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ftp_pool_in_use ON public.ftp_pool(in_use) WHERE in_use = FALSE;

COMMENT ON TABLE public.ftp_pool IS 'Subcuentas Hetzner (read-only) para asignar una por compra. Llenar con las creadas en Hetzner Console.';

-- Ejemplo (sustituir por tus subcuentas reales):
-- INSERT INTO ftp_pool (username, password) VALUES
-- ('u540473-sub1', 'contraseña_sub1'),
-- ('u540473-sub2', 'contraseña_sub2');
