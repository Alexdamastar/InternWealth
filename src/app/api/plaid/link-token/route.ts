// POST /api/plaid/link-token — create a Plaid Link token so the browser can
// open the Link flow. Returns { linkToken } or { linkToken: null, reason }.
// ALWAYS returns HTTP 200 so the ingest page can degrade to CSV upload.

import { cookies } from 'next/headers';
import { CountryCode, Products } from 'plaid';
import { makePlaidClient, plaidConfigured, PLAID_COOKIE } from '@/lib/plaid';

export async function POST() {
  if (!plaidConfigured()) {
    return Response.json(
      { linkToken: null, reason: 'not_configured' },
      { status: 200 },
    );
  }

  try {
    const client = makePlaidClient();
    // client_user_id only needs to be stable per user; there are no accounts,
    // so a per-browser random id is fine (it is not used to key anything).
    const cookieStore = await cookies();
    const linked = cookieStore.has(PLAID_COOKIE);

    const response = await client.linkTokenCreate({
      user: { client_user_id: crypto.randomUUID() },
      client_name: 'InternWealth',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      // An internship statement window; more history = slower initial sync.
      transactions: { days_requested: 180 },
    });

    return Response.json(
      { linkToken: response.data.link_token, alreadyLinked: linked },
      { status: 200 },
    );
  } catch {
    // Never log the error object — Plaid errors can echo request headers.
    return Response.json({ linkToken: null, reason: 'plaid_error' }, { status: 200 });
  }
}
