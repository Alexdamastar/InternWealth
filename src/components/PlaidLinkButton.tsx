'use client';

// Connect-your-bank button for /ingest, backed by Plaid Link.
// Graceful degradation: if the server has no Plaid keys (or Plaid errors),
// this renders nothing and the CSV path stands alone. On success it hands the
// mapped, categorized transactions to the parent — same shape the CSV
// pipeline produces.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import type { Transaction } from '@/lib/types';

interface Props {
  onTransactions: (txns: Transaction[], label: string) => void;
  onStatus: (message: string) => void;
  disabled?: boolean;
}

type TxResponse = {
  linked: boolean;
  ready?: boolean;
  reason?: string;
  transactions?: Transaction[];
};

// Poll /api/plaid/transactions while Plaid finishes its historical pull.
const POLL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

export default function PlaidLinkButton({ onTransactions, onStatus, disabled }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  // null = still checking; render nothing until we know, so a no-Plaid setup
  // never flashes a dead button.
  const [available, setAvailable] = useState<boolean | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    (async () => {
      try {
        const res = await fetch('/api/plaid/link-token', { method: 'POST' });
        const data = (await res.json()) as { linkToken: string | null; alreadyLinked?: boolean };
        if (cancelled.current) return;
        if (!data.linkToken) {
          setAvailable(false);
          return;
        }
        setLinkToken(data.linkToken);
        setLinked(Boolean(data.alreadyLinked));
        setAvailable(true);
      } catch {
        if (!cancelled.current) setAvailable(false);
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, []);

  const fetchTransactions = useCallback(async () => {
    setBusy(true);
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      if (cancelled.current) return;
      try {
        const res = await fetch('/api/plaid/transactions');
        const data = (await res.json()) as TxResponse;
        if (!data.linked) {
          setLinked(false);
          onStatus(
            data.reason === 'relink_required'
              ? 'Your bank link expired — connect again to refresh.'
              : 'No bank account linked.',
          );
          setBusy(false);
          return;
        }
        if (data.ready && data.transactions) {
          setLinked(true);
          onTransactions(data.transactions, 'your linked bank account');
          setBusy(false);
          return;
        }
        onStatus('Your bank is still sending history — hang tight…');
      } catch {
        // transient network error; keep polling
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    onStatus('Bank history is taking a while. Try “Refresh from bank” again in a minute.');
    setBusy(false);
  }, [onTransactions, onStatus]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      setBusy(true);
      onStatus('Linking your account…');
      try {
        const res = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ publicToken }),
        });
        const data = (await res.json()) as { ok: boolean };
        if (!data.ok) {
          onStatus('Could not link the account. You can still upload a CSV.');
          setBusy(false);
          return;
        }
      } catch {
        onStatus('Could not link the account. You can still upload a CSV.');
        setBusy(false);
        return;
      }
      setLinked(true);
      onStatus('Linked! Pulling transactions…');
      await fetchTransactions();
    },
    onExit: () => onStatus(''),
  });

  async function unlink() {
    setBusy(true);
    try {
      await fetch('/api/plaid/exchange', { method: 'DELETE' });
      setLinked(false);
      onStatus('Bank account unlinked.');
    } catch {
      onStatus('Could not unlink. Try again.');
    }
    setBusy(false);
  }

  if (!available) return null;

  const blocked = disabled || busy;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {linked ? (
        <>
          <button
            onClick={fetchTransactions}
            disabled={blocked}
            className="bg-moss text-paper px-4 py-2 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors disabled:opacity-50"
          >
            Refresh from bank
          </button>
          <button
            onClick={unlink}
            disabled={blocked}
            className="border border-ink/25 px-4 py-2 text-sm font-semibold hover:border-ink hover:bg-paper transition-colors disabled:opacity-50"
          >
            Unlink bank
          </button>
        </>
      ) : (
        <button
          onClick={() => open()}
          disabled={blocked || !ready}
          className="bg-moss text-paper px-4 py-2 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors disabled:opacity-50"
        >
          Connect your bank
        </button>
      )}
      <span className="text-xs text-faint max-w-xs leading-snug">
        Via Plaid. The access token stays in a cookie on this browser — there
        is no server database.
      </span>
    </div>
  );
}
