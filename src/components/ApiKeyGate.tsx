'use client';

// Wraps the app. If no Anthropic key is present, shows a friendly BYO-key entry
// screen explaining the privacy model. The key lives only in sessionStorage.
// See §2 (privacy claim) and §10.

import { useEffect, useState } from 'react';
import { getApiKey, setApiKey, clearApiKey } from '@/lib/storage';

export default function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    // Intentional: read browser-only sessionStorage after mount to avoid an
    // SSR/CSR hydration mismatch. The key is never available during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasKey(Boolean(getApiKey()));
    setReady(true);
  }, []);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setHasKey(true);
    setDraft('');
  }

  function reset() {
    clearApiKey();
    setHasKey(false);
  }

  // Avoid hydration mismatch: render nothing until we've checked storage.
  if (!ready) return null;

  if (!hasKey) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 flex-1 rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-4">
          Before we begin
        </p>
        <h1 className="font-display font-semibold text-3xl tracking-tight mb-4">
          Bring your own API key
        </h1>
        <div className="space-y-3 text-sm text-ink-2 leading-relaxed mb-6">
          <p>
            InternWealth is fully open source and runs locally. There&apos;s no
            server we own — your statements and goals live only on your machine
            (browser storage). The only thing that ever leaves is the specific
            text you send to Anthropic&apos;s API under your own key, and nothing
            is persisted anywhere but your local disk.
          </p>
          <p>
            Your key is stored in this tab&apos;s{' '}
            <code className="font-mono text-xs bg-line/50 px-1 py-0.5">
              sessionStorage
            </code>
            , cleared when you close the tab. It is never committed, never
            logged.
          </p>
        </div>
        <label
          className="block text-xs font-mono uppercase tracking-wider text-faint mb-1.5"
          htmlFor="apiKey"
        >
          Anthropic API key
        </label>
        <input
          id="apiKey"
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="sk-ant-..."
          className="w-full bg-card border border-line px-3 py-2.5 mb-4 font-mono text-sm placeholder:text-faint focus:border-moss"
          autoComplete="off"
        />
        <button
          onClick={save}
          disabled={!draft.trim()}
          className="bg-moss text-paper px-6 py-2.5 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save key &amp; continue
        </button>
        <p className="text-xs text-faint mt-5 leading-relaxed">
          Get a key at{' '}
          <a
            className="underline hover:text-ink"
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
          >
            console.anthropic.com
          </a>
          . The allocation plan itself works even without a key — the key only
          powers the conversational and narrative features.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-2 text-right">
        <button
          onClick={reset}
          className="text-xs text-faint hover:text-ink underline decoration-line underline-offset-2"
        >
          Clear API key
        </button>
      </div>
      {children}
    </>
  );
}
