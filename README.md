# InternWealth

**A locally-run, open-source financial agent for incoming SWE interns.**
Built for the AFE Intern Hackathon 2026 — theme: *Pay it Forward*.

No incoming intern reads a 21-page finance guide. So we turned that guide into an
agent that personalizes it to your actual numbers in about 5 minutes. That's paying
it forward.

---

## What it does

1. **Set goals** — a short conversation (or a one-click sample profile) fills in your
   income, essential expenses, current savings, whether your 401(k) match realistically
   vests, Roth contributions so far, work state, and whether your internship ends soon.
2. **Upload transactions** — drop in a bank CSV (or paste it). InternWealth categorizes
   your spending and shows income vs. spending.
3. **Get a plan** — a **deterministic** allocation waterfall funds an emergency fund (HYSA),
   school-year expenses, and a Roth IRA in the exact priority order the guide recommends.
   Whatever is left after the Roth IRA is maxed is your **surplus**, and *you* decide how to
   split it across **cash**, a **taxable brokerage**, and a **Roth 401(k)** — the app shows
   the tradeoffs (optionality vs. growth vs. taxes, plus the 10% early-withdrawal penalty)
   for each, you set any mix with sliders, and the plan recomputes instantly. A plain-English
   explanation and spending observations round it out.

## The core principle: the math is not an LLM guess

**All money math is deterministic TypeScript in [`src/lib/engine.ts`](src/lib/engine.ts).
The LLM never computes a dollar amount.** The model is used only to (a) extract goals from
conversation, (b) categorize transactions, and (c) write the plain-English narrative. The
allocation numbers are coded straight from the guide, so they are correct and reproducible.
The engine is covered by unit tests in `src/lib/engine.test.ts`.

The plan renders fully **without any LLM call** — categorization falls back to a keyword
categorizer, and the narrative falls back to the engine's own rationale strings.

## Privacy

> Fully open source, runs locally, bring your own API key. There's no server we own — your
> statements and goals live only on your machine. The only thing that ever leaves is the
> specific text you send to Anthropic's API under your own key, and nothing is persisted
> anywhere but your local disk.

Your API key is held in the browser's `sessionStorage` (cleared when the tab closes). It is
never committed, never logged, and never read from a committed env file.

## Educational disclaimer

InternWealth is **for general educational purposes only** and is **not licensed financial
advice**. Investing involves risk, including possible loss of principal. You are solely
responsible for any decisions you make. A persistent banner and every generated explanation
repeat this.

## Run it

```bash
cd internwealth
npm install
npm run dev
# open http://localhost:3000
```

Then either paste your Anthropic API key when prompted (get one at
[console.anthropic.com](https://console.anthropic.com/settings/keys)) — or just click
**"Load sample statement"** on the home page for a zero-setup demo that needs no key.

### Tests & build

```bash
npm test        # vitest — allocation engine unit tests
npm run build   # production build
```

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · papaparse · zod ·
Anthropic Claude (`claude-opus-4-8`) via the hosted API with a user-supplied key. No vector
DB, no RAG — the guide fits in context and is loaded whole as the system prompt.

## Knowledge base & attribution

The knowledge base is *The Ultimate Financial Guide for SWE Interns*, written by
**Alexander Lumala** (former Amazon SWE intern), embedded in
[`src/lib/kb.ts`](src/lib/kb.ts). Used with attribution.

## License

[MIT](LICENSE).
