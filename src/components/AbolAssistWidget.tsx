import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Send, Bot, RefreshCw, X, MessageCircleQuestion } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const HIDDEN_ON = ['/auth', '/assistant'];

const getFallbackResponse = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('ceremony') || m.includes('jebena')) {
    return 'The Ethiopian coffee ceremony roasts green beans over charcoal, grinds them by hand, and brews them in a clay jebena. It is served in three rounds — Abol, Tona and Bereka — and can last two to three hours.';
  }
  if (m.includes('coffee') || m.includes('buna')) {
    return 'Buna (ቡና) is Ethiopian coffee — the birthplace of arabica. It is far more than a drink: it is a ceremony that brings people together. Ask me about Yirgacheffe, Harrar, or the three rounds!';
  }
  if (m.includes('hello') || m.includes('hi') || m.includes('selam')) {
    return 'Selam! ☕️ I am Abol Assist. Ask me anything about Ethiopian coffee culture or how to use Buna Chat.';
  }
  return 'I specialise in Ethiopian coffee culture and Buna Chat. Try asking about the coffee ceremony, bean varieties, or an app feature.';
};

const AbolAssistWidget = () => {
  const location = useLocation();
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Selam! ☕️ I am Abol Assist, your Buna guide. Ask me anything.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  if (!user || HIDDEN_ON.some(p => location.pathname.startsWith(p))) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('abol-assist', {
        body: { messages: next.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data?.message || getFallbackResponse(text) }]);
    } catch (err) {
      console.error('Abol Assist error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: getFallbackResponse(text) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-[80] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Open Abol Assist"
        >
          <MessageCircleQuestion size={26} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-96 z-[80] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[70vh]">
          <div className="buna-header px-4 py-3 flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">Abol Assist</p>
              <p className="text-[11px] opacity-80">Your Buna guide ☕️</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="p-1">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
            {messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-2xl flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-border flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask Abol Assist…"
              className="input-buna flex-1 py-2"
              disabled={loading}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AbolAssistWidget;
