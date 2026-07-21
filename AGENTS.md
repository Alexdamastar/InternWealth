# InternWealth — agent guide

A locally-run, open-source financial planner for incoming SWE interns. The user
answers a few questions and/or uploads bank transactions, and the app produces a
**deterministic** allocation plan (emergency fund → school-year expenses → Roth
IRA → 401(k) → brokerage). An LLM (Claude via Amazon Bedrock) powers the
conversational parts, but never computes a dollar amount.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**, **Tailwind CSS v4**.
- Next.js 16 has breaking changes vs. older versions — if an API surprises you,
  read the relevant guide in `node_modules/next/dist/docs/` before writing code.
- **Vitest** for tests. **Recharts** for charts. **Papa Parse** for CSV.
- LLM: `@anthropic-ai/bedrock-sdk` — see `src/lib/anthropic.ts`.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build — run this to verify changes compile
npm run test       # vitest run (unit tests for the tax + allocation engines)
npm run lint       # eslint
```

Always run `npm run build` and `npm run test` before considering a change done.

## Architecture — the core rule

**The LLM never computes a number.** All money math is pure, tested TypeScript:

- `src/lib/engine.ts` — the allocation waterfall + per-step rationales. Tested in `engine.test.ts`.
- `src/lib/tax.ts` — deterministic tax + take-home estimator (federal brackets,
  FICA, dual-state, self-employment, dependent standard-deduction cap). Mirrors
  the IRS Tax Withholding Estimator. Tested in `tax.test.ts`.

The LLM only handles conversation and prose: onboarding chat, transaction
categorization, and the optional plain-English explanation. Every LLM feature has
a **deterministic local fallback** so the app fully works with Bedrock down:

- Categorization → `categorizeLocal` keyword categorizer (`src/lib/categorize.ts`)
- Onboarding → a "Skip & use sample profile" button (`src/lib/sample.ts`)
- Explanation → the coded engine rationales render instead

### The flow (also the nav order)

`/onboarding` (Goals) → `/ingest` (Transactions) → `/tax` (Tax) → `/plan` (Plan) → `/progress` (Progress)

State is passed forward through **`localStorage`** (`src/lib/storage.ts`) — there
is no server and no auth. The tax step writes a monthly take-home that `/plan`
uses as post-tax income.

### API routes (`src/app/api/*`)

`chat`, `categorize`, `explain` — all call Bedrock via `src/lib/anthropic.ts`.
Auth is the **machine's own AWS credential chain** (env vars, `~/.aws` profiles,
SSO, or an instance role) — never an API key, never a request header. Model
defaults to `global.anthropic.claude-sonnet-5`, overridable via
`BEDROCK_MODEL_ID`; region via `AWS_REGION`. Routes always return HTTP 200 with a
graceful shape so the client falls back cleanly.

## Conventions

- **Design system ("warm-ledger"):** Tailwind tokens `paper / card / ink / ink-2 /
  faint / line`, `moss` / `moss-deep` (green accent), `good`, `warn-bg` /
  `warn-text`. `font-display` (serif) for headings, `--font-sans` for body,
  `font-mono` for uppercase tracked labels. `.rise` entrance animation,
  `shadow-card`, square corners (no rounding on inputs/cards).
- **Dropdowns:** use the shared `src/components/Dropdown.tsx`, not native
  `<select>` — native option popups can't be height-constrained and overflow the
  screen on long lists.
- **Number entry:** use digit-constrained text inputs (`inputMode="numeric"`),
  not `type="number"` — no spinner steppers.
- Never log or commit AWS credentials or any secret.
- This is educational, not licensed financial advice — keep that framing in
  user-facing copy.
