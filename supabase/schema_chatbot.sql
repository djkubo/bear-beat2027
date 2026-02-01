-- ================================================
-- SCHEMA DE CHATBOT/CONVERSACIONES - Bear Beat
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- Tabla de conversaciones (una por usuario)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificadores
  manychat_subscriber_id VARCHAR(100) UNIQUE,
  user_id UUID REFERENCES users(id),
  
  -- Datos del contacto
  phone VARCHAR(20),
  email VARCHAR(255),
  name VARCHAR(255),
  
  -- Estado de la conversación
  status VARCHAR(50) DEFAULT 'active', -- active, resolved, pending_human, escalated
  current_intent VARCHAR(100),         -- última intención detectada
  sentiment VARCHAR(20),               -- positive, neutral, negative
  
  -- Métricas
  total_messages INTEGER DEFAULT 0,
  bot_messages INTEGER DEFAULT 0,
  human_messages INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  
  -- Flags
  needs_human BOOLEAN DEFAULT FALSE,
  is_vip BOOLEAN DEFAULT FALSE,
  has_purchased BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_bot_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de mensajes individuales
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Contenido
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text', -- text, image, audio, video, file, button_click
  
  -- Dirección
  direction VARCHAR(10) NOT NULL, -- inbound (usuario), outbound (bot/agente)
  sender_type VARCHAR(20) NOT NULL, -- user, bot, human_agent
  
  -- ManyChat data
  manychat_message_id VARCHAR(100),
  manychat_subscriber_id VARCHAR(100),
  
  -- Análisis de NLP
  detected_intent VARCHAR(100),      -- password_reset, payment_issue, product_question, etc.
  intent_confidence DECIMAL(3,2),    -- 0.00 a 1.00
  detected_entities JSONB,           -- { "email": "...", "order_id": "..." }
  sentiment VARCHAR(20),             -- positive, neutral, negative
  language VARCHAR(10) DEFAULT 'es', -- es, en
  
  -- Respuesta del bot
  bot_response TEXT,
  bot_action_taken VARCHAR(100),     -- sent_password_reset, verified_payment, etc.
  bot_action_result JSONB,           -- resultado de la acción
  
  -- Métricas
  response_time_ms INTEGER,          -- tiempo que tardó el bot en responder
  was_helpful BOOLEAN,               -- feedback del usuario
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de intenciones conocidas
CREATE TABLE IF NOT EXISTS intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name VARCHAR(100) UNIQUE NOT NULL,  -- password_reset, payment_issue, etc.
  display_name VARCHAR(255),          -- "Olvidé mi contraseña"
  category VARCHAR(50),               -- support, sales, info, complaint
  
  -- Patrones de detección (keywords)
  keywords TEXT[],                    -- {'contraseña', 'password', 'olvidé', 'no puedo entrar'}
  patterns TEXT[],                    -- regex patterns
  
  -- Respuesta automática
  auto_response TEXT,                 -- Respuesta predeterminada
  auto_action VARCHAR(100),           -- Acción a ejecutar
  requires_human BOOLEAN DEFAULT FALSE,
  
  -- Métricas
  total_matches INTEGER DEFAULT 0,
  successful_resolutions INTEGER DEFAULT 0,
  
  -- Config
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,         -- mayor = más prioritario
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de knowledge base (preguntas frecuentes)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Categoría
  category VARCHAR(100),              -- producto, pagos, descargas, cuenta, etc.
  
  -- Pregunta y variaciones
  question TEXT NOT NULL,
  question_variations TEXT[],         -- Diferentes formas de preguntar lo mismo
  keywords TEXT[],                    -- Keywords para matching
  
  -- Respuesta
  answer TEXT NOT NULL,
  short_answer TEXT,                  -- Versión corta para WhatsApp
  
  -- Recursos adicionales
  related_url VARCHAR(500),
  related_video_url VARCHAR(500),
  
  -- Métricas
  times_used INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  
  -- Config
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de acciones del bot
CREATE TABLE IF NOT EXISTS bot_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  
  -- Acción
  action_type VARCHAR(100) NOT NULL,  -- password_reset, verify_payment, activate_access, etc.
  action_params JSONB,                -- Parámetros de la acción
  
  -- Resultado
  status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed, requires_human
  result JSONB,
  error_message TEXT,
  
  -- Timestamps
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de analytics de conversaciones
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  date DATE NOT NULL,
  
  -- Métricas diarias
  total_conversations INTEGER DEFAULT 0,
  new_conversations INTEGER DEFAULT 0,
  resolved_conversations INTEGER DEFAULT 0,
  escalated_to_human INTEGER DEFAULT 0,
  
  -- Mensajes
  total_messages INTEGER DEFAULT 0,
  inbound_messages INTEGER DEFAULT 0,
  outbound_messages INTEGER DEFAULT 0,
  
  -- Intenciones más comunes
  top_intents JSONB,                  -- [{ "intent": "password_reset", "count": 50 }]
  
  -- Sentimiento
  positive_conversations INTEGER DEFAULT 0,
  neutral_conversations INTEGER DEFAULT 0,
  negative_conversations INTEGER DEFAULT 0,
  
  -- Tiempos
  avg_response_time_ms INTEGER,
  avg_resolution_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

-- ================================================
-- ÍNDICES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_conversations_manychat ON conversations(manychat_subscriber_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_needs_human ON conversations(needs_human) WHERE needs_human = TRUE;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_intent ON messages(detected_intent);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON knowledge_base USING GIN(keywords);

-- ================================================
-- DATOS INICIALES - INTENCIONES
-- ================================================

INSERT INTO intents (name, display_name, category, keywords, auto_response, auto_action, requires_human, priority) VALUES

-- SOPORTE - Contraseña
('password_reset', 'Olvidé mi contraseña', 'support', 
  ARRAY['contraseña', 'password', 'olvidé', 'no puedo entrar', 'restablecer', 'recuperar', 'clave', 'acceso', 'no recuerdo'],
  '¡Hola! 👋 Entiendo que olvidaste tu contraseña. Te ayudo a recuperarla ahora mismo. ¿Me puedes confirmar tu email registrado?',
  'password_reset',
  FALSE, 10),

-- SOPORTE - Pago sin acceso
('payment_no_access', 'Pagué pero no tengo acceso', 'support',
  ARRAY['pagué', 'pague', 'no tengo acceso', 'ya pagué', 'compré', 'compre', 'no puedo descargar', 'no me llegó', 'no llego', 'activar', 'mi compra'],
  '¡Hola! 👋 Lamento que tengas ese problema. Voy a verificar tu pago ahora mismo. ¿Me puedes dar tu email o número de teléfono con el que pagaste?',
  'verify_payment',
  FALSE, 10),

-- SOPORTE - Problema de descarga
('download_issue', 'Problema con descarga', 'support',
  ARRAY['no puedo descargar', 'descarga', 'error al descargar', 'ftp', 'filezilla', 'air explorer', 'muy lento', 'se para', 'no funciona'],
  '¡Hola! 👋 Te ayudo con la descarga. ¿Puedes decirme qué error te aparece o qué está pasando exactamente?',
  'download_help',
  FALSE, 8),

-- VENTAS - Precio
('price_question', 'Pregunta de precio', 'sales',
  ARRAY['precio', 'costo', 'cuánto', 'cuanto', 'vale', 'cuesta', 'pagar', 'promoción', 'descuento', 'oferta'],
  '¡Hola! 🎉 El pack de Video Remixes 2026 tiene un precio de $350 MXN (pago único). Incluye más de 3,000 videos HD/4K organizados por género. ¿Te gustaría comprarlo ahora?',
  NULL,
  FALSE, 7),

-- VENTAS - Métodos de pago
('payment_methods', 'Métodos de pago', 'sales',
  ARRAY['cómo pago', 'como pago', 'formas de pago', 'métodos', 'tarjeta', 'oxxo', 'spei', 'transferencia', 'paypal', 'efectivo'],
  '¡Hola! 💳 Puedes pagar con:\n\n🏪 OXXO (efectivo)\n🏦 SPEI (transferencia)\n💳 Tarjeta de crédito/débito\n\n¿Cuál prefieres?',
  NULL,
  FALSE, 7),

-- VENTAS - Contenido
('content_question', 'Pregunta sobre contenido', 'sales',
  ARRAY['qué incluye', 'que incluye', 'contenido', 'géneros', 'generos', 'videos', 'cuántos', 'cuantos', 'lista', 'catálogo'],
  '¡Hola! 🎵 El pack incluye más de 3,000 videos de alta calidad:\n\n🎤 Reggaeton\n🎸 Rock\n🎹 Pop\n🎺 Cumbia\n🎷 Salsa\n💿 Electrónica\n¡Y muchos más géneros!\n\n¿Te gustaría ver un demo?',
  NULL,
  FALSE, 6),

-- INFO - Cómo funciona
('how_it_works', 'Cómo funciona', 'info',
  ARRAY['cómo funciona', 'como funciona', 'qué es', 'que es', 'explicar', 'entiendo', 'para qué sirve'],
  '¡Hola! 👋 Bear Beat es una plataforma de video remixes para DJs:\n\n1️⃣ Pagas una sola vez ($350 MXN)\n2️⃣ Obtienes acceso inmediato\n3️⃣ Descargas todos los videos que quieras\n4️⃣ Los usas en tus eventos\n\n¿Tienes alguna otra pregunta?',
  NULL,
  FALSE, 5),

-- SOPORTE - Factura
('invoice_request', 'Solicitud de factura', 'support',
  ARRAY['factura', 'facturar', 'cfdi', 'rfc', 'comprobante', 'fiscal'],
  '¡Hola! 🧾 Claro que podemos facturar tu compra. Por favor envíame:\n\n1. RFC\n2. Razón social\n3. Email para factura\n4. Uso de CFDI\n\nY te la envío en máximo 24 horas.',
  'invoice_request',
  FALSE, 6),

-- QUEJA
('complaint', 'Queja o problema', 'complaint',
  ARRAY['queja', 'molesto', 'enojado', 'mal servicio', 'terrible', 'pésimo', 'estafa', 'fraude', 'devolver', 'reembolso'],
  '¡Hola! 😔 Lamento mucho que tengas una mala experiencia. Tu satisfacción es muy importante para nosotros. Cuéntame qué pasó y haré todo lo posible por ayudarte.',
  NULL,
  TRUE, 10),

-- SALUDO
('greeting', 'Saludo', 'info',
  ARRAY['hola', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'qué tal', 'que tal'],
  '¡Hola! 👋 Bienvenido a Bear Beat. Soy el asistente virtual y estoy aquí para ayudarte.\n\n¿En qué puedo ayudarte hoy?\n\n💳 Comprar el pack\n🔑 Problemas de acceso\n📥 Ayuda con descargas\n❓ Otras preguntas',
  NULL,
  FALSE, 1),

-- DESPEDIDA
('goodbye', 'Despedida', 'info',
  ARRAY['gracias', 'adiós', 'adios', 'bye', 'hasta luego', 'nos vemos', 'chao', 'ok gracias'],
  '¡Gracias por contactarnos! 🙌 Si tienes más preguntas, aquí estaré. ¡Que tengas un excelente día! 🎵',
  NULL,
  FALSE, 1),

-- HABLAR CON HUMANO
('human_request', 'Hablar con humano', 'support',
  ARRAY['hablar con alguien', 'persona real', 'agente', 'humano', 'asesor', 'ejecutivo', 'soporte real'],
  '¡Entendido! 👤 Te conecto con un agente humano. Por favor espera un momento, alguien te atenderá pronto.',
  'escalate_to_human',
  TRUE, 10)

ON CONFLICT (name) DO NOTHING;

-- ================================================
-- DATOS INICIALES - KNOWLEDGE BASE
-- ================================================

INSERT INTO knowledge_base (category, question, question_variations, keywords, answer, short_answer) VALUES

('producto', '¿Qué es Bear Beat?', 
  ARRAY['qué es esto', 'de qué se trata', 'para qué sirve'],
  ARRAY['qué es', 'bear beat', 'servicio'],
  'Bear Beat es una plataforma de video remixes profesionales para DJs. Ofrecemos packs mensuales con más de 3,000 videos HD/4K organizados por género, listos para usar en tus eventos. Con un solo pago de $350 MXN obtienes acceso permanente al pack.',
  'Bear Beat = Videos para DJs. 3,000+ videos HD/4K por $350 MXN (pago único).'),

('producto', '¿Cuántos videos incluye el pack?',
  ARRAY['cuántos videos hay', 'cantidad de videos', 'número de videos'],
  ARRAY['cuántos', 'videos', 'cantidad'],
  'El pack incluye más de 3,000 videos en alta calidad (HD y 4K). Los videos están organizados por género musical y se actualizan constantemente con nuevos lanzamientos.',
  '3,000+ videos HD/4K organizados por género.'),

('pagos', '¿Cuáles son las formas de pago?',
  ARRAY['cómo puedo pagar', 'métodos de pago', 'formas de pagar'],
  ARRAY['pago', 'pagar', 'formas', 'métodos'],
  'Aceptamos múltiples formas de pago:\n\n🏪 OXXO - Paga en efectivo en cualquier tienda\n🏦 SPEI - Transferencia bancaria inmediata\n💳 Tarjeta - Crédito o débito\n\nEl más rápido es tarjeta (acceso inmediato). OXXO y SPEI pueden tardar hasta 24 horas.',
  'OXXO, SPEI o Tarjeta. Con tarjeta el acceso es inmediato.'),

('descargas', '¿Cómo descargo los videos?',
  ARRAY['cómo bajo los videos', 'dónde descargo', 'link de descarga'],
  ARRAY['descargar', 'download', 'bajar'],
  'Tienes 2 opciones para descargar:\n\n1️⃣ Web - Descarga directa desde tu navegador\n2️⃣ FTP - Descarga masiva con FileZilla o Air Explorer (más rápido para descargar todo)\n\nDespués de pagar, recibirás las instrucciones y credenciales por email y WhatsApp.',
  'Por web o FTP (FileZilla/Air Explorer). Te enviamos instrucciones al pagar.'),

('cuenta', '¿Cómo recupero mi contraseña?',
  ARRAY['olvidé mi contraseña', 'no puedo entrar', 'restablecer clave'],
  ARRAY['contraseña', 'password', 'recuperar', 'olvidé'],
  'Para recuperar tu contraseña:\n\n1. Ve a bearbeat.com/login\n2. Haz clic en "¿Olvidaste tu contraseña?"\n3. Ingresa tu email\n4. Revisa tu bandeja (y spam)\n5. Sigue el link para crear nueva contraseña\n\n¿Necesitas ayuda adicional?',
  'Ve a bearbeat.com/login > "Olvidé mi contraseña" > Revisa tu email.'),

('soporte', '¿Pagué pero no tengo acceso?',
  ARRAY['ya pagué y no puedo entrar', 'no me llegó mi acceso', 'compré pero no puedo descargar'],
  ARRAY['pagué', 'no acceso', 'no llega'],
  'Si ya pagaste pero no tienes acceso:\n\n1. Revisa tu email (incluyendo spam)\n2. Si pagaste con OXXO/SPEI, puede tardar hasta 24 horas\n3. Escríbenos tu email de compra y verificamos tu pago\n\nSi el problema persiste, te activamos manualmente el acceso.',
  'Revisa spam. OXXO/SPEI tardan hasta 24h. Envíanos tu email de compra para verificar.')

ON CONFLICT DO NOTHING;

-- ================================================
-- FUNCIONES
-- ================================================

-- Función para obtener o crear conversación
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_manychat_id VARCHAR(100),
  p_phone VARCHAR(20) DEFAULT NULL,
  p_email VARCHAR(255) DEFAULT NULL,
  p_name VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Buscar conversación existente
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE manychat_subscriber_id = p_manychat_id;
  
  -- Si no existe, crear nueva
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (manychat_subscriber_id, phone, email, name, first_message_at)
    VALUES (p_manychat_id, p_phone, p_email, p_name, NOW())
    RETURNING id INTO v_conversation_id;
  ELSE
    -- Actualizar datos si vienen nuevos
    UPDATE conversations SET
      phone = COALESCE(p_phone, phone),
      email = COALESCE(p_email, email),
      name = COALESCE(p_name, name),
      updated_at = NOW()
    WHERE id = v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Función para detectar intención
CREATE OR REPLACE FUNCTION detect_intent(p_message TEXT)
RETURNS TABLE (
  intent_name VARCHAR(100),
  confidence DECIMAL(3,2)
) AS $$
DECLARE
  v_message_lower TEXT := LOWER(p_message);
BEGIN
  RETURN QUERY
  SELECT 
    i.name,
    CASE 
      WHEN (
        SELECT COUNT(*) 
        FROM unnest(i.keywords) k 
        WHERE v_message_lower LIKE '%' || k || '%'
      ) > 2 THEN 0.95::DECIMAL(3,2)
      WHEN (
        SELECT COUNT(*) 
        FROM unnest(i.keywords) k 
        WHERE v_message_lower LIKE '%' || k || '%'
      ) > 0 THEN 0.75::DECIMAL(3,2)
      ELSE 0.00::DECIMAL(3,2)
    END as confidence
  FROM intents i
  WHERE i.is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM unnest(i.keywords) k 
      WHERE v_message_lower LIKE '%' || k || '%'
    )
  ORDER BY 
    priority DESC,
    confidence DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas del chatbot
CREATE OR REPLACE FUNCTION get_chatbot_stats(days_ago INTEGER DEFAULT 30)
RETURNS TABLE (
  total_conversations BIGINT,
  resolved_conversations BIGINT,
  pending_human BIGINT,
  total_messages BIGINT,
  avg_response_time_ms NUMERIC,
  top_intent TEXT,
  top_intent_count BIGINT,
  resolution_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id)::BIGINT as total_conversations,
    COUNT(DISTINCT CASE WHEN c.status = 'resolved' THEN c.id END)::BIGINT as resolved_conversations,
    COUNT(DISTINCT CASE WHEN c.needs_human = TRUE THEN c.id END)::BIGINT as pending_human,
    (SELECT COUNT(*)::BIGINT FROM messages WHERE created_at >= NOW() - (days_ago || ' days')::INTERVAL) as total_messages,
    (SELECT AVG(response_time_ms)::NUMERIC FROM messages WHERE response_time_ms IS NOT NULL AND created_at >= NOW() - (days_ago || ' days')::INTERVAL) as avg_response_time_ms,
    (SELECT detected_intent FROM messages WHERE detected_intent IS NOT NULL AND created_at >= NOW() - (days_ago || ' days')::INTERVAL GROUP BY detected_intent ORDER BY COUNT(*) DESC LIMIT 1) as top_intent,
    (SELECT COUNT(*)::BIGINT FROM messages WHERE detected_intent = (SELECT detected_intent FROM messages WHERE detected_intent IS NOT NULL GROUP BY detected_intent ORDER BY COUNT(*) DESC LIMIT 1) AND created_at >= NOW() - (days_ago || ' days')::INTERVAL) as top_intent_count,
    ROUND(
      COUNT(DISTINCT CASE WHEN c.status = 'resolved' THEN c.id END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT c.id), 0) * 100,
      2
    ) as resolution_rate
  FROM conversations c
  WHERE c.created_at >= NOW() - (days_ago || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger para actualizar métricas de conversación
CREATE OR REPLACE FUNCTION update_conversation_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET
    total_messages = total_messages + 1,
    bot_messages = bot_messages + CASE WHEN NEW.sender_type = 'bot' THEN 1 ELSE 0 END,
    human_messages = human_messages + CASE WHEN NEW.sender_type = 'user' THEN 1 ELSE 0 END,
    last_message_at = NEW.created_at,
    last_bot_response_at = CASE WHEN NEW.sender_type = 'bot' THEN NEW.created_at ELSE last_bot_response_at END,
    current_intent = COALESCE(NEW.detected_intent, current_intent),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_conversation_metrics
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_metrics();

-- Trigger para actualizar contador de intención
CREATE OR REPLACE FUNCTION update_intent_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.detected_intent IS NOT NULL THEN
    UPDATE intents SET
      total_matches = total_matches + 1,
      updated_at = NOW()
    WHERE name = NEW.detected_intent;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_intent_metrics
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_intent_metrics();
