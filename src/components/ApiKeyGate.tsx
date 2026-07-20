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
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-3">Bring your own API key</h1>
        <p className="text-sm text-gray-600 mb-4">
          InternWealth is fully open source and runs locally. There&apos;s no
          server we own — your statements and goals live only on your machine
          (browser storage). The only thing that ever leaves is the specific text
          you send to Anthropic&apos;s API under your own key, and nothing is
          persisted anywhere but your local disk.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Your key is stored in this tab&apos;s <code>sessionStorage</code>,
          cleared when you close the tab. It is never committed, never logged.
        </p>
        <label className="block text-sm font-medium mb-1" htmlFor="apiKey">
          Anthropic API key
        </label>
        <input
          id="apiKey"
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="sk-ant-..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 font-mono text-sm"
          autoComplete="off"
        />
        <button
          onClick={save}
          disabled={!draft.trim()}
          className="bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Save key &amp; continue
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Get a key at{' '}
          <a
            className="underline"
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
      <div className="max-w-5xl mx-auto px-4 pt-2 text-right">
        <button
          onClick={reset}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Clear API key
        </button>
      </div>
      {children}
    </>
  );
}
