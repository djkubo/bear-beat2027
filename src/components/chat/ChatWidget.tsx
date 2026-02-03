'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const STORAGE_DISMISSED_PREFIX = 'bb_announcement_dismissed_';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'Hey! 👋 ¿Quieres ver la lista de tracks del Pack 2026 antes de que suba de precio?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const announcementIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          history: messages.slice(-4) // Enviamos contexto corto
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

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start w-[calc(100vw-32px)] max-w-[350px] pointer-events-none [&>*]:pointer-events-auto">
      {/* VENTANA DEL CHAT – ancho seguro móvil, anti-zoom input 16px */}
      {isOpen && (
        <div className="mb-3 w-full h-[500px] max-h-[70vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          
          {/* HEADER */}
          <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-white">BearBot AI 🤖</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* MENSAJES */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm",
                  m.role === 'user' 
                    ? "bg-cyan-600 text-white rounded-tr-none" 
                    : "bg-zinc-800 text-zinc-200 rounded-tl-none"
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                </div>
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
            <input
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-[16px] text-white focus:outline-none focus:border-cyan-500"
              placeholder="Escribe aquí..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button size="icon" className="bg-cyan-600 hover:bg-cyan-500" onClick={sendMessage}>
              <Send size={18} />
            </Button>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE */}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/20"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </Button>
    </div>
  );
}
