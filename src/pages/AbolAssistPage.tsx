import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Bot, User } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AbolAssistPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Selam! ☕️ I\'m Abol Assist, your Ethiopian coffee culture guide. Ask me anything about Buna traditions, the coffee ceremony, or how to use Buna Chat!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Simple AI response simulation based on keywords
      let response = '';
      const lowerInput = userMessage.toLowerCase();

      if (lowerInput.includes('coffee') || lowerInput.includes('buna')) {
        response = 'Ethiopian coffee (Buna) is more than just a drink - it\'s a ceremony and cultural experience! The coffee ceremony, called "Jebena Buna," involves roasting green beans, grinding them, and brewing in a traditional clay pot called Jebena. It\'s served in three rounds: Abol (first), Tona (second), and Bereka (third, blessing). Would you like to know more about any specific aspect?';
      } else if (lowerInput.includes('ceremony') || lowerInput.includes('jebena')) {
        response = 'The Ethiopian coffee ceremony is a beautiful ritual! It includes: 1) Roasting green coffee beans over charcoal, 2) Grinding with a mortar and pestle, 3) Brewing in a Jebena (clay pot), 4) Serving three rounds - Abol, Tona, Bereka. The ceremony often includes burning incense (etan) and serving popcorn or snacks. It can last 2-3 hours and is a time for community bonding!';
      } else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('selam')) {
        response = 'Selam! ☕️ Welcome to Buna Chat! I\'m here to help you with anything related to Ethiopian coffee culture or how to use this app. What would you like to know?';
      } else if (lowerInput.includes('app') || lowerInput.includes('use') || lowerInput.includes('how')) {
        response = 'Buna Chat helps you connect with others over Ethiopian coffee culture! Here\'s what you can do:\n\n• Home: See posts and news\n• Buna Rooms: Join or create coffee discussion groups\n• Chat: Message other users\n• News: Stay updated on Ethiopian news\n• Study Buna: Learn about coffee culture\n\nTap "Nu Buna Tetu" to invite friends!';
      } else if (lowerInput.includes('history') || lowerInput.includes('origin')) {
        response = 'Ethiopia is the birthplace of coffee! Legend says a goat herder named Kaldi discovered coffee around 850 AD when he noticed his goats became energetic after eating red berries. The monks at a nearby monastery used the berries to stay awake during prayers, and coffee spread from there to Yemen and eventually the world!';
      } else {
        response = 'That\'s a great question! While I specialize in Ethiopian coffee culture, I\'d be happy to help. Could you tell me more about what you\'d like to know? I can help with:\n\n• Coffee ceremony traditions\n• Ethiopian coffee history\n• Using Buna Chat features\n• Coffee bean varieties\n• Buna etiquette';
      }

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I had trouble processing that. Please try again!' 
      }]);
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
      <header className="buna-header px-4 py-3 flex items-center gap-3">
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
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 pb-24 bg-card border-t border-border">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Abol Assist..."
            className="input-buna flex-1"
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
