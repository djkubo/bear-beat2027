'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const STORAGE_DISMISSED_PREFIX = 'bb_announcement_dismissed_';
const BB_USER_NAME_COOKIE = 'bb_user_name';
const BB_MC_ID_COOKIE = 'bb_mc_id';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const DEFAULT_GREETING = '¡Hola! 👋 ¿Tienes dudas sobre el pack o quieres ver el catálogo?';

/** Altura disponible para la ventana del chat (viewport visible - teclado en móvil). */
function useVisualViewportHeight() {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const update = () => setHeight(window.visualViewport!.height);
    update();
    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);
  return height;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: DEFAULT_GREETING }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromManyChat, setFromManyChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const announcementIdRef = useRef<number | null>(null);
  const viewportHeight = useVisualViewportHeight();

  // ManyChat: saludo personalizado y auto-apertura si vienen del chat
  useEffect(() => {
    const userName = getCookie(BB_USER_NAME_COOKIE);
    const mcId = getCookie(BB_MC_ID_COOKIE);
    if (userName && userName.trim()) {
      const greeting = `¡Hola ${userName.trim()}! 👋 ¿Te ayudo a activar tu cuenta o a resolver alguna duda?`;
      setMessages(prev => prev.length === 1 && prev[0].role === 'assistant'
        ? [{ role: 'assistant', content: greeting }]
        : prev);
    }
    if (mcId) {
      setFromManyChat(true);
      const t = setTimeout(() => {
        setIsOpen(true);
        setFromManyChat(false);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const scrollInputIntoView = useCallback(() => {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  // Anuncios globales proactivos: si hay uno activo y no lo cerró antes, abrir chat y mostrarlo
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('global_announcements')
      .select('id, message')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: announcement, error }) => {
        if (error || !announcement) return;
        const dismissed = typeof window !== 'undefined' && localStorage.getItem(STORAGE_DISMISSED_PREFIX + announcement.id);
        if (dismissed) return;
        announcementIdRef.current = announcement.id;
        setMessages(prev => [{ role: 'assistant', content: `📢 ${announcement.message}` }, ...prev]);
        setIsOpen(true);
      });
  }, []);

  // Al cerrar el chat, marcar anuncio como visto para no volver a abrirlo
  useEffect(() => {
    if (!isOpen && announcementIdRef.current !== null) {
      try {
        localStorage.setItem(STORAGE_DISMISSED_PREFIX + announcementIdRef.current, '1');
      } catch (_) {}
      announcementIdRef.current = null;
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          history: messages.slice(-4),
          userId: user?.id ?? undefined,
        })
      });

      const data = await res.json();
      
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de red. Intenta de nuevo. 🔴' }]);
    } finally {
      setLoading(false);
    }
  };

  const availableHeight = viewportHeight != null && viewportHeight > 120 ? viewportHeight - 100 : null;
  const chatPanelMaxHeight =
    availableHeight != null ? `min(380px, ${Math.max(200, availableHeight)}px)` : 'min(380px, 55dvh)';

  return (
    <div
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[45] flex flex-col items-end max-w-[min(350px,calc(100vw-2rem)] w-[calc(100vw-2rem)] md:w-auto md:max-w-[350px] pointer-events-none [&>*]:pointer-events-auto"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        paddingRight: 'env(safe-area-inset-right, 0)',
      }}
    >
      {/* Ventana del chat: altura limitada al viewport visible para no salirse al escribir en móvil */}
      {isOpen && (
        <div
          className="mb-3 w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden shrink-0"
          style={{
            height: chatPanelMaxHeight,
            maxHeight: chatPanelMaxHeight,
          }}
        >
          {/* HEADER */}
          <div className="p-3 md:p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="font-bold text-white truncate">BearBot AI 🤖</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white p-1 -m-1 touch-manipulation"
              aria-label="Cerrar chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* MENSAJES */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden space-y-4 overscroll-contain"
          >
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] p-3 rounded-2xl text-sm break-words',
                    m.role === 'user'
                      ? 'bg-bear-blue text-bear-black rounded-tr-none'
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                  <Loader2 className="w-4 h-4 animate-spin text-bear-blue" />
                </div>
              </div>
            )}
          </div>

          {/* INPUT – scrollIntoView al enfocar para que no quede bajo el teclado */}
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-[16px] text-white focus:outline-none focus:border-bear-blue"
              placeholder="Escribe aquí..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={scrollInputIntoView}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button
              size="icon"
              type="button"
              className="h-11 w-11 shrink-0 bg-bear-blue hover:brightness-110 text-bear-black touch-manipulation"
              onClick={sendMessage}
              aria-label="Enviar"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      )}

      {/* Botón flotante: esquina inferior derecha, siempre accesible */}
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
        className={cn(
          'h-12 w-12 min-w-[48px] min-h-[48px] rounded-full bg-bear-blue/90 hover:bg-bear-blue text-bear-black shadow-lg touch-manipulation',
          fromManyChat && !isOpen && 'animate-bounce'
        )}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </Button>
    </div>
  );
}
