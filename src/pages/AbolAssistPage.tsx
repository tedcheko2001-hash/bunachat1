import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, Bot, RefreshCw } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AbolAssistPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Selam! ☕️ I\'m Abol Assist, your Ethiopian coffee culture guide. Ask me anything about Buna traditions, the coffee ceremony, Ethiopian culture, or how to use Buna Chat!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getFallbackResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('coffee') || lowerMessage.includes('buna')) {
      return 'Ethiopian coffee (Buna) is more than just a drink - it\'s a ceremony and cultural experience! The coffee ceremony, called "Jebena Buna," involves roasting green beans, grinding them, and brewing in a traditional clay pot called Jebena. It\'s served in three rounds: Abol (first), Tona (second), and Bereka (third, blessing). Would you like to know more?';
    } else if (lowerMessage.includes('ceremony') || lowerMessage.includes('jebena')) {
      return 'The Ethiopian coffee ceremony is a beautiful ritual! It includes:\n\n1) Roasting green coffee beans over charcoal\n2) Grinding with a mortar and pestle\n3) Brewing in a Jebena (clay pot)\n4) Serving three rounds - Abol, Tona, Bereka\n\nThe ceremony often includes burning incense (etan) and serving popcorn. It can last 2-3 hours!';
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('selam')) {
      return 'Selam! ☕️ Welcome to Buna Chat! I\'m here to help you with Ethiopian coffee culture or app questions. What would you like to know?';
    } else if (lowerMessage.includes('app') || lowerMessage.includes('help') || lowerMessage.includes('how')) {
      return 'Buna Chat helps you connect over Ethiopian coffee culture!\n\n• Home: See posts and news\n• Buna Rooms: Join discussion groups\n• Chat: Message others\n• Study Buna: Learn coffee culture\n• Profile: Customize your account\n\nTap "Nu Buna Tetu" to invite friends!';
    } else if (lowerMessage.includes('history') || lowerMessage.includes('origin')) {
      return 'Ethiopia is the birthplace of coffee! Legend says a goat herder named Kaldi discovered coffee around 850 AD when his goats became energetic after eating red berries. The monks used the berries to stay awake during prayers, and coffee spread from there to the world!';
    } else if (lowerMessage.includes('abol') || lowerMessage.includes('tona') || lowerMessage.includes('bereka')) {
      return 'In the Ethiopian coffee ceremony, coffee is served in three rounds:\n\n☕ **Abol** (First round) - The strongest and most important\n☕ **Tona** (Second round) - Slightly weaker\n☕ **Bereka** (Third round) - The blessing round, lightest\n\nIt\'s considered impolite to leave before drinking all three cups!';
    } else {
      return 'That\'s a great question! I specialize in Ethiopian coffee culture and helping you use Buna Chat. I can help with:\n\n• Coffee ceremony traditions\n• Ethiopian coffee history\n• Using Buna Chat features\n• Coffee bean varieties\n• Ethiopian culture\n\nWhat would you like to explore?';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('abol-assist', {
        body: { 
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      const assistantMessage = data?.message || getFallbackResponse(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      console.error('Abol Assist error:', err);
      // Use fallback response when edge function fails
      const fallbackResponse = getFallbackResponse(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-container bg-background flex flex-col h-screen">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="font-semibold">Abol Assist</h1>
            <p className="text-xs text-primary-foreground/70">Your Buna Guide ☕️</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={16} className="text-primary" />
                  <span className="text-xs font-medium text-primary">Abol Assist</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-line">{message.content}</p>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed above bottom nav */}
      <div className="p-4 pb-24 bg-card border-t border-border shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Abol Assist..."
            className="input-buna flex-1"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-opacity"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AbolAssistPage;
