// Server-side Plaid client. Only ever imported from /api/plaid/* route
// handlers — never from client components.
//
// Configuration comes from env vars (put them in .env.local, which is
// gitignored):
//   PLAID_CLIENT_ID  — from https://dashboard.plaid.com/developers/keys
//   PLAID_SECRET     — the secret for the environment below
//   PLAID_ENV        — 'sandbox' (default) or 'production'
//
// Local-first story: the Plaid access token is stored in an httpOnly cookie
// on the intern's own browser, so it never touches a server we own (there is
// no server DB) and client-side JS can't read it. Credentials and tokens are
// never logged.

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

export const PLAID_COOKIE = 'internwealth_plaid_access_token';

// 30 days; relinking is one click if it expires.
export const PLAID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

const PLAID_ENV: keyof typeof PlaidEnvironments =
  process.env.PLAID_ENV === 'production' ? 'production' : 'sandbox';

export const plaidEnvName = () => PLAID_ENV;

export function makePlaidClient(): PlaidApi {
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[PLAID_ENV],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    }),
  );
}
