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
    .filter((w) => w.length >= 2);
}

const NO_RESULT_RESPONSE = `No encontré información sobre eso en mi base de conocimiento. Te sugiero:

📝 Revisar nuestra web en https://medicamentum360.com
💬 Contactar a soporte en /soporte
📧 Escribir a soporte@medicamentum360.com

¿Hay algo más en lo que pueda ayudarte?`;

// Respuestas directas para saludos y preguntas simples (sin depender de Gemini ni KB)
function getDirectResponse(query: string): string | null {
  const q = query.toLowerCase().trim().replace(/[!?¿¡]/g, '').replace(/\s+/g, ' ');

  if (q === 'hola' || q === 'hola como estas' || q === 'buenos dias' || q === 'buenas tardes' || q === 'buenas noches' || q === 'hey' || q === 'hi') {
    return '¡Hola! 👋 Soy medicalMen 🩺, el asistente virtual de Medicamentum360. Puedo ayudarte con información sobre cursos, marketplace, precios, reembolsos, cómo vender tus cursos y soporte técnico. ¿En qué te puedo ayudar?';
  }

  if (q === 'quien eres' || q === 'que eres' || q === 'quien sos' || q === 'como te llamas') {
    return 'Soy **medicalMen** 🩺, el asistente virtual con IA de Medicamentum360. Mi función es ayudarte con información sobre la plataforma: cursos médicos, marketplace, precios, capacitación corporativa, cómo crear y vender cursos, privacidad y soporte técnico. Estoy potenciado por Google Gemini para darte respuestas precisas basadas en nuestra documentación oficial.';
  }

  if (q === 'gracias' || q === 'muchas gracias') {
    return '¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte sobre Medicamentum360?';
  }

  if (q === 'adios' || q === 'chao' || q === 'hasta luego' || q === 'nos vemos') {
    return '¡Hasta pronto! 🩺 No dudes en volver si tienes más preguntas sobre Medicamentum360.';
  }

  if (q === 'que puedes hacer' || q === 'que haces' || q === 'ayuda' || q === 'help') {
    return 'Puedo ayudarte con:\n📚 Información sobre cursos y marketplace\n💰 Precios, pagos y reembolsos\n🏥 Capacitación corporativa para hospitales\n👨‍🏫 Cómo convertirte en vendedor (vendor)\n🔒 Privacidad de datos y seguridad\n❓ Soporte técnico\n\n¡Pregúntame lo que necesites! 🩺';
  }

  return null;
}

const GREETING = `¡Hola! 👋 Soy **medicalMen** 🩺, tu asistente virtual de Medicamentum360.

Puedo ayudarte con:
📚 Cursos y marketplace
💰 Precios y reembolsos
🏥 Capacitación corporativa
👨‍🏫 Cómo crear y vender tus cursos
🔒 Privacidad y datos
❓ Soporte técnico

¿En qué te puedo ayudar hoy?`;

const SYSTEM_PROMPT = `Eres medicalMen, el asistente virtual de Medicamentum360, una plataforma SaaS de e-learning médico en Colombia. Responde en español colombiano con tono profesional pero cercano y cálido.

Reglas:
- Si el usuario saluda ("hola", "buenos días"), responde el saludo y preséntate brevemente.
- Si la pregunta es sobre la plataforma, usa el contexto proporcionado para responder con precisión.
- Siempre cita la fuente si usas información del contexto (ej: "según nuestra política de precios...").
- Si no encuentras la respuesta en el contexto, sé honesto y sugiere contactar a soporte.
- NUNCA inventes información que no esté en el contexto.
- Para preguntas médicas clínicas, aclara que eres un asistente de plataforma, no un médico.`;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbLoaded, setKbLoaded] = useState(false);
  const [kbCount, setKbCount] = useState(0);
  const kbChunksRef = useRef<KbChunk[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  // Load knowledge base
  useEffect(() => {
    if (!open || kbLoaded) return;

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
          if (clean.length > 1000) {
            const sentences = clean.split(/(?<=[.!?])\s+/);
            let chunk = '';
            for (const s of sentences) {
              if ((chunk + s).length > 1000 && chunk) {
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
      if (script.parentNode) document.head.removeChild(script);
    };
  }, [open, kbLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const searchKB = useCallback((query: string, topK = 4): KbChunk[] => {
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
      .filter((r) => r.score > 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }, []);

  const callGemini = useCallback(
    async (query: string, context: string): Promise<string | null> => {
      const key = apiKey;
      if (!key) return null;

      const prompt = `${SYSTEM_PROMPT}\n\n${
        context
          ? `CONTEXTO DE LA PLATAFORMA (usa esto para responder):\n${context}\n\n`
          : ''
      }PREGUNTA DEL USUARIO: ${query}`;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
            }),
          },
        );

        if (!res.ok) {
          const errBody = await res.text();
          console.warn('[Gemini] API error:', res.status, errBody.substring(0, 200));
          return null;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          console.warn('[Gemini] No text in response:', JSON.stringify(data).substring(0, 300));
        }
        return text || null;
      } catch (err) {
        console.warn('[Gemini] Network error:', err);
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

    // Buscar contexto en la KB
    const results = searchKB(query, 4);
    const context = results
      .map((r) => `[Fuente: ${r.source}]\n${r.content}`)
      .join('\n\n');

    let answer: string;
    let source: string | undefined;

    // 0. Respuestas directas para saludos y preguntas simples (sin API ni KB)
    const direct = getDirectResponse(query);
    if (direct) {
      answer = direct;
    } else {
      // 1. Intentar Gemini SIEMPRE si hay API key
      const geminiAnswer = await callGemini(query, context);

      if (geminiAnswer) {
        answer = geminiAnswer;
        if (results.length > 0) source = results[0].source;
      } else if (results.length > 0) {
        // 2. Fallback: usar KB directamente
        source = results[0].source;
        answer = results[0].content.trim();
        if (answer.length > 1500) answer = answer.substring(0, 1500) + '...';
        answer += `\n\n*(Fuente: ${source})*`;
      } else {
        // 3. Sin Gemini y sin KB
        answer = NO_RESULT_RESPONSE;
      }
    }

    setMessages((prev) => [...prev, { role: 'agent', text: answer, source }]);
    setLoading(false);
  }, [input, loading, searchKB, callGemini]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-300',
          'bg-gradient-to-br from-violet-600 to-indigo-600 text-white',
          'hover:scale-110 hover:shadow-violet-500/40',
          open && 'scale-0 opacity-0',
        )}
        aria-label="Abrir chat con medicalMen"
      >
        <Stethoscope className="size-6" />
      </button>

      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-300',
          'bg-gradient-to-b from-[#1a0533] to-[#0d0221]',
          open
            ? 'w-[390px] h-[580px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] scale-100 opacity-100'
            : 'w-0 h-0 scale-95 opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3 shrink-0">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-lg">
            🩺
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-violet-200">medicalMen</h3>
            <p className="text-xs text-violet-400/70 truncate">
              {apiKey ? 'Gemini Flash' : 'Búsqueda local'}
              {kbLoaded && ` · ${kbCount} docs`}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-violet-400/60 hover:bg-white/10 hover:text-violet-300 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2 text-sm',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              {msg.role === 'agent' && (
                <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-xs">
                  🩺
                </div>
              )}
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'bg-white/8 text-gray-200 rounded-bl-md',
                )}
                style={{ animation: 'fadeIn 0.3s ease' }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\n/g, '<br>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-violet-400 underline">$1</a>'),
                  }}
                />
                {msg.source && (
                  <p className="mt-1.5 text-xs text-violet-400/60 border-t border-white/5 pt-1.5">
                    📄 {msg.source}
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
        <div className="border-t border-white/10 bg-white/5 px-3 py-3 shrink-0">
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
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
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
