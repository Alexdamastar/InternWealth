// POST /api/plaid/exchange — swap the public token from a successful Link
// flow for an access token, stored ONLY in an httpOnly cookie on the intern's
// browser. There is no server DB; the token never lands anywhere else and is
// never logged. DELETE unlinks (removes the Item at Plaid and clears the cookie).

import { cookies } from 'next/headers';
import {
  makePlaidClient,
  plaidConfigured,
  PLAID_COOKIE,
  PLAID_COOKIE_MAX_AGE,
} from '@/lib/plaid';

export async function POST(req: Request) {
  if (!plaidConfigured()) {
    return Response.json({ ok: false, reason: 'not_configured' }, { status: 200 });
  }

  let publicToken = '';
  try {
    const body = await req.json();
    if (typeof body?.publicToken === 'string') publicToken = body.publicToken;
  } catch {
    // fall through to the empty-token check
  }
  if (!publicToken) {
    return Response.json({ ok: false, reason: 'missing_public_token' }, { status: 200 });
  }

  try {
    const client = makePlaidClient();
    const response = await client.itemPublicTokenExchange({ public_token: publicToken });

    const cookieStore = await cookies();
    cookieStore.set(PLAID_COOKIE, response.data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/plaid',
      maxAge: PLAID_COOKIE_MAX_AGE,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ ok: false, reason: 'plaid_error' }, { status: 200 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLAID_COOKIE)?.value;

  if (token && plaidConfigured()) {
    try {
      await makePlaidClient().itemRemove({ access_token: token });
    } catch {
      // Still clear the cookie — the worst case is an orphaned sandbox Item.
    }
  }

  // Path must match the one used in set() or the browser keeps the cookie.
  cookieStore.delete({ name: PLAID_COOKIE, path: '/api/plaid' });
  return Response.json({ ok: true }, { status: 200 });
}
