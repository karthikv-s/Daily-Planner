'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputLocal, setInputLocal] = useState('');
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLocal.trim() || isTyping) return;

    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: inputLocal };
    setMessages(prev => [...prev, userMessage]);
    setInputLocal('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages(prev => 
          prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
        );
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Oops! Unable to reach the AI server.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  return (
    <>
      <button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white z-50 transition-transform hover:scale-105 active:scale-95 group"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 w-[350px] sm:w-[400px] h-[550px] max-h-[80vh] flex flex-col shadow-2xl z-50 rounded-2xl overflow-hidden border border-border bg-background animate-in slide-in-from-bottom-6 fade-in duration-300">
          <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 px-5 flex justify-between items-center shadow-md z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold leading-none">Planner AI</h3>
                <span className="text-[10px] text-violet-200 font-medium">Online</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20">
              <X className="w-4 h-4" />
            </button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground mt-12 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Bot className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="font-bold text-foreground">Hi! I&apos;m your AI Assistant.</h4>
                <p className="text-sm mt-1 max-w-[220px]">Ask me for productivity advice, or brainstorm your next task with me!</p>
              </div>
            ) : (
              messages.map(m => (
                <div key={m.id} className={`flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' : 'bg-gradient-to-br from-orange-400 to-amber-500 text-white'}`}>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 text-sm shadow-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm' : 'bg-background border rounded-2xl rounded-tl-sm hover:shadow-md transition-shadow'}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="flex gap-3 max-w-[85%] animate-in fade-in">
                 <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-orange-400 to-amber-500 text-white">
                   <Bot className="w-4 h-4" />
                 </div>
                 <div className="p-4 bg-background border rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[44px]">
                   <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"></span>
                   <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce delay-150"></span>
                   <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce delay-300"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
          
          <form onSubmit={handleFormSubmit} className="p-3 bg-background border-t">
            <div className="relative flex items-center shadow-sm rounded-full bg-muted/50 focus-within:bg-background transition-colors focus-within:ring-2 focus-within:ring-violet-500/30">
              <input
                value={inputLocal}
                onChange={(e) => setInputLocal(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full h-12 pl-5 pr-14 rounded-full border-none bg-transparent outline-none text-sm"
              />
              <button 
                type="submit" 
                disabled={isTyping || !inputLocal.trim()} 
                className="absolute right-1.5 w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md disabled:bg-muted disabled:text-muted-foreground transition-all active:scale-95"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
