'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KbChunk {
  content: string;
  source: string;
  score: number;
}

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  source?: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

const NO_RESULT_RESPONSE = `No encontré información sobre eso en mi base de conocimiento. Te sugiero:

📝 Revisar nuestra web en https://medicamentum360.com
💬 Contactar a soporte en /soporte
📧 Escribir a soporte@medicamentum360.com

¿Hay algo más en lo que pueda ayudarte?`;

const GREETING = `¡Hola! 👋 Soy **Dr. Medici** 🩺, tu asistente virtual de Medicamentum360.

Puedo ayudarte con:
📚 Cursos y marketplace
💰 Precios y reembolsos
🏥 Capacitación corporativa
👨‍🏫 Cómo crear y vender tus cursos
🔒 Privacidad y datos
❓ Soporte técnico

¿En qué te puedo ayudar hoy?`;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [kbLoaded, setKbLoaded] = useState(false);
  const [kbCount, setKbCount] = useState(0);
  const kbChunksRef = useRef<KbChunk[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load knowledge base
  useEffect(() => {
    if (kbLoaded) return;

    const script = document.createElement('script');
    script.src = '/knowledge-base.js';
    script.onload = () => {
      const raw = (window as any).KB_FILES;
      if (!raw) return;

      const chunks: KbChunk[] = [];
      for (const [source, text] of Object.entries(raw)) {
        const paragraphs = (text as string).split(/\n\n+/);
        for (const para of paragraphs) {
          const clean = para.trim();
          if (clean.length < 50) continue;
          if (clean.length > 800) {
            const sentences = clean.split(/(?<=[.!?])\s+/);
            let chunk = '';
            for (const s of sentences) {
              if ((chunk + s).length > 800 && chunk) {
                chunks.push({ content: chunk.trim(), source, score: 0 });
                chunk = s;
              } else {
                chunk += (chunk ? ' ' : '') + s;
              }
            }
            if (chunk.trim()) chunks.push({ content: chunk.trim(), source, score: 0 });
          } else {
            chunks.push({ content: clean, source, score: 0 });
          }
        }
      }
      kbChunksRef.current = chunks;
      setKbCount(chunks.length);
      setKbLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [kbLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const searchKB = useCallback((query: string, topK = 5): KbChunk[] => {
    const chunks = kbChunksRef.current;
    if (!query || !chunks.length) return [];

    const queryTokens = tokenize(query);
    if (!queryTokens.length) return [];

    const scored = chunks.map((chunk) => {
      const chunkTokens = tokenize(chunk.content);
      const matchCount = queryTokens.filter((qt) => chunkTokens.includes(qt)).length;
      return { ...chunk, score: matchCount / Math.max(1, Math.sqrt(chunkTokens.length)) };
    });

    return scored
      .filter((r) => r.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }, []);

  const askGPT = useCallback(
    async (query: string, context: string): Promise<string | null> => {
      if (!apiKey) return null;
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'Eres Dr. Medici, asistente virtual de Medicamentum360. Responde en español colombiano con tono profesional y cálido. Cita la fuente de la información. Si no encuentras la respuesta en el contexto proporcionado, dilo honestamente. Contexto:\n\n' +
                  context,
              },
              { role: 'user', content: query },
            ],
            max_tokens: 600,
            temperature: 0.3,
          }),
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
      } catch {
        return null;
      }
    },
    [apiKey],
  );

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    const results = searchKB(query, 5);

    let answer: string;
    let source: string | undefined;

    if (results.length > 0) {
      source = results[0].source;
      const context = results
        .map((r) => `[Fuente: ${r.source}]\n${r.content}`)
        .join('\n\n');
      const gptAnswer = await askGPT(query, context);
      if (gptAnswer) {
        answer = gptAnswer;
      } else {
        answer = results[0].content.trim();
        if (answer.length > 1500) answer = answer.substring(0, 1500) + '...';
        answer += `\n\n*(Fuente: ${source})*`;
      }
    } else {
      answer = NO_RESULT_RESPONSE;
    }

    setMessages((prev) => [...prev, { role: 'agent', text: answer, source }]);
    setLoading(false);
  }, [input, loading, searchKB, askGPT]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-300',
          'bg-gradient-to-br from-violet-600 to-indigo-600 text-white',
          'hover:scale-110 hover:shadow-violet-500/40',
          open && 'scale-0 opacity-0',
        )}
        aria-label="Abrir chat con Dr. Medici"
      >
        <Stethoscope className="size-6" />
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-300',
          'bg-gradient-to-b from-[#1a0533] to-[#0d0221] backdrop-blur-xl',
          open
            ? 'w-[380px] h-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] scale-100 opacity-100'
            : 'w-0 h-0 scale-95 opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-lg">
            🩺
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-violet-200">Dr. Medici</h3>
            <p className="text-xs text-violet-400/70 truncate">
              {apiKey ? 'GPT-4o-mini' : 'Búsqueda local'}
              {kbLoaded && ` · ${kbCount} docs`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="rounded-lg p-1.5 text-violet-400/60 hover:bg-white/10 hover:text-violet-300 transition-colors"
              title="Configurar API Key"
            >
              <Loader2 className="size-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-violet-400/60 hover:bg-white/10 hover:text-violet-300 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* API Config */}
        {showApiConfig && (
          <div className="border-b border-white/10 bg-white/5 px-4 py-2">
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="OpenAI API Key (opcional)"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-violet-200 placeholder:text-violet-500/50 focus:border-violet-500/50 focus:outline-none"
              />
              <button
                onClick={() => setShowApiConfig(false)}
                className="rounded-lg bg-violet-600/30 px-2 py-1 text-xs text-violet-300 hover:bg-violet-600/50 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2 text-sm',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
              style={{ animation: 'fadeIn 0.3s ease' }}
            >
              {msg.role === 'agent' && (
                <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-xs">
                  🩺
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'bg-white/8 text-gray-200 rounded-bl-md',
                )}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\n/g, '<br>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                />
                {msg.source && (
                  <p className="mt-1 text-xs text-violet-400/60">
                    Fuente: {msg.source}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-violet-400/60">
              <div className="flex size-6 items-center justify-center rounded-full bg-violet-600/30 text-xs">
                🩺
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block size-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '0ms' }} />
                <span className="inline-block size-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '150ms' }} />
                <span className="inline-block size-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 bg-white/5 px-3 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta..."
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition-all hover:bg-violet-500 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
