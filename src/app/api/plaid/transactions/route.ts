// GET /api/plaid/transactions — pull the linked account's transactions via
// /transactions/sync and return them in the app's Transaction shape.
// ALWAYS returns HTTP 200:
//   { linked: false }                          — no account linked (or not configured)
//   { linked: true, ready: false }             — Plaid is still pulling history; retry
//   { linked: true, ready: true, transactions } — mapped, categorized, date-sorted
// The access token comes from the httpOnly cookie and is never logged or
// echoed. Categorization is fully deterministic (see lib/plaidMap.ts).

import { cookies } from 'next/headers';
import { TransactionsUpdateStatus } from 'plaid';
import { makePlaidClient, plaidConfigured, PLAID_COOKIE } from '@/lib/plaid';
import { mapPlaidTransactions } from '@/lib/plaidMap';
import type { PlaidTxLike } from '@/lib/plaidMap';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(PLAID_COOKIE)?.value;

  if (!accessToken || !plaidConfigured()) {
    return Response.json({ linked: false }, { status: 200 });
  }

  try {
    const client = makePlaidClient();
    const added: PlaidTxLike[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let status: TransactionsUpdateStatus | undefined;

    // Fresh sync each request (no stored cursor): with no server DB there is
    // nowhere durable to keep one, and a summer of transactions is small.
    while (hasMore) {
      const response = await client.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 500,
      });
      added.push(...(response.data.added as PlaidTxLike[]));
      cursor = response.data.next_cursor;
      hasMore = response.data.has_more;
      status = response.data.transactions_update_status;
    }

    // Right after linking, Plaid is still fetching history in the background.
    // Tell the client to poll rather than hand back a partial statement.
    if (status === TransactionsUpdateStatus.NotReady) {
      return Response.json({ linked: true, ready: false }, { status: 200 });
    }

    return Response.json(
      { linked: true, ready: true, transactions: mapPlaidTransactions(added) },
      { status: 200 },
    );
  } catch (err) {
    // A revoked/expired Item needs a fresh Link flow — clear the dead cookie.
    const code = (err as { response?: { data?: { error_code?: string } } })?.response?.data
      ?.error_code;
    if (code === 'ITEM_LOGIN_REQUIRED' || code === 'INVALID_ACCESS_TOKEN') {
      cookieStore.delete({ name: PLAID_COOKIE, path: '/api/plaid' });
      return Response.json({ linked: false, reason: 'relink_required' }, { status: 200 });
    }
    return Response.json({ linked: true, ready: false, reason: 'plaid_error' }, { status: 200 });
  }
}
