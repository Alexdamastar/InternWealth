'use client';

// Onboarding chat. Talks to /api/chat, which asks probing questions and emits a
// fenced json WORKING-PLAN block every turn (summary + profile + goals +
// complete). We strip that block from the displayed prose (rendered as Markdown)
// and hand the parsed plan up to the parent, which shows it live on the side and
// gates the "Continue" button on `complete`.
import { useEffect, useRef, useState } from 'react';
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
// Handles both a properly closed fence and an UNCLOSED one (```json to end),
// so a reply that truncated mid-JSON never leaks raw JSON into the chat bubble.
function stripJsonBlock(text: string): string {
  return text
    .replace(/```json\s*[\s\S]*?```/gi, '')
    .replace(/```json\s*[\s\S]*$/gi, '')
    .trim();
}

export default function ChatPanel({
  plan,
  onPlanUpdate,
}: {
  plan?: WorkingPlan | null;
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, workingPlan: plan ?? undefined }),
      });
      const data = (await res.json()) as {
        reply: string | null;
        workingPlan?: WorkingPlan;
        error?: string;
      };

      if (!data.reply) {
        setNotice(
          'The assistant is unavailable right now (check your AWS credentials / Bedrock access). ' +
            'You can use the "Skip & use sample profile" button below, or try again.' +
            (data.error ? `\n\nDetails: ${data.error}` : ''),
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
    <div className="bg-card border border-line shadow-card flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="w-2 h-2 rounded-full bg-moss" />
        <span className="font-mono text-xs uppercase tracking-wider text-faint">
          Chat with InternWealth
        </span>
      </div>

      <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-3 p-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-moss text-paper rounded-l-lg rounded-tr-lg'
                  : 'bg-paper border border-line text-ink rounded-r-lg rounded-tl-lg'
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
            <div className="bg-paper border border-line text-faint rounded-r-lg rounded-tl-lg px-3.5 py-2.5 text-sm dot-pulse">
              <span>●</span> <span>●</span> <span>●</span>
            </div>
          </div>
        )}
      </div>

      {notice && (
        <div className="mx-5 mb-3 bg-warn-bg border-l-2 border-warn-text p-3 text-sm text-warn-text whitespace-pre-line">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-line p-4">
        <input
          className="flex-1 bg-paper/60 border border-line px-3 py-2 text-sm placeholder:text-faint focus:border-moss"
          placeholder="Type your answer…"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          disabled={loading || input.trim() === ''}
          className="bg-moss text-paper px-4 py-2 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
