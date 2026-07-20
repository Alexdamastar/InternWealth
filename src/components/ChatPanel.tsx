'use client';

// Onboarding chat. Talks to /api/chat, which asks probing questions and emits a
// fenced json WORKING-PLAN block every turn (summary + profile + goals +
// complete). We strip that block from the displayed prose (rendered as Markdown)
// and hand the parsed plan up to the parent, which shows it live on the side and
// gates the "Continue" button on `complete`.
import { useEffect, useRef, useState } from 'react';
import { KEY_HEADER } from '@/lib/anthropic';
import { getApiKey } from '@/lib/storage';
import type { ChatMessage, WorkingPlan } from '@/lib/types';
import Markdown from '@/components/Markdown';

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hey! I'm **InternWealth**. Tell me a bit about your internship money situation " +
    "and I'll build a plan for you on the right as we talk. What do you earn each month, " +
    'roughly what are your essential monthly expenses (rent, food, transport), ' +
    'and how much do you have saved so far?',
};

// Hide the fenced ```json ... ``` block so the user sees prose, not raw JSON.
function stripJsonBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/gi, '').trim();
}

export default function ChatPanel({
  onPlanUpdate,
}: {
  onPlanUpdate: (plan: WorkingPlan) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setNotice(null);
    setLoading(true);

    try {
      const key = getApiKey() ?? '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [KEY_HEADER]: key },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as {
        reply: string | null;
        workingPlan?: WorkingPlan;
        error?: string;
      };

      if (!data.reply) {
        setNotice(
          data.error === 'no-key'
            ? 'No Anthropic API key found. Add a key, or use the "Skip & use sample profile" button below to keep going.'
            : 'The assistant is unavailable right now. You can use the "Skip & use sample profile" button below, or add an API key and try again.',
        );
        return;
      }

      // Keep the RAW reply (including the ```json working-plan block) in the
      // history we send back to the API. The model needs to see its own prior
      // blocks in-context to keep emitting an updated one every turn — strip only
      // at render time. Without this, the plan updates once then goes stale.
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || "Great — I've got what I need!" },
      ]);

      if (data.workingPlan) {
        onPlanUpdate(data.workingPlan);
      }
    } catch {
      setNotice(
        'Something went wrong reaching the assistant. Use "Skip & use sample profile" below, or try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {m.role === 'assistant' ? (
                <Markdown
                  content={stripJsonBlock(m.content) || "Got it — I've updated your plan on the right."}
                  className="space-y-2"
                />
              ) : (
                <span className="whitespace-pre-line">{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-lg px-3 py-2 text-sm italic">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {notice && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Type your answer…"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          disabled={loading || input.trim() === ''}
          className="bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
