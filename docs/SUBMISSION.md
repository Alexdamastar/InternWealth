# InternWealth — Hack Amazon submission

**Team pitch (one paragraph).** InternWealth is a locally-run, open-source financial agent
for incoming SWE interns. You answer a few probing questions to set financial goals, upload
your bank transactions, and the app produces a deterministic, personalized allocation plan —
how much to put toward an emergency fund (HYSA), school-year expenses, a Roth IRA, a 401(k),
and a taxable brokerage — plus a plain-English explanation and spending analysis. The
knowledge base is a real 21-page financial guide written by a former Amazon SWE intern.
No incoming intern reads 21 pages, so we turned that guide into an agent that personalizes it
to your actual numbers in 5 minutes. That's paying it forward.

## Why it's different (say this to judges)

- **The math is deterministic, not an LLM guess.** The allocation waterfall is coded
  TypeScript in `engine.ts`, straight from the guide, and unit-tested (24 vitest cases). The
  LLM only personalizes language — it never computes a dollar amount. "We didn't hand the
  math to an LLM and hope."
- **The surplus is a guided decision, not a black box.** After the Roth IRA is maxed, the
  intern splits the leftover across cash / brokerage / Roth 401(k) with sliders; the engine
  distributes whole dollars exactly (largest-remainder, no rounding drift) and the app shows
  the deterministic pros/cons of each — mirroring the guide's "Roth 401(k) as extra Roth
  space" advanced case, including the 10% early-withdrawal penalty caveat.
- **It works with zero LLM calls.** Keyword categorization fallback + engine rationale
  strings mean the whole plan renders offline. The API key only powers the *nice* parts
  (conversation, narrative).
- **Real privacy story.** Open source, runs locally, bring your own API key. No server we
  own. Statements/goals live only on the user's machine; the only thing that leaves is the
  text sent to Anthropic under the user's own key.
- **Correctness for an L8 audience.** 2026 Roth IRA limit is $7,500 (verified). WA Cares is
  presented as a mandatory payroll deduction. Evaluation *criteria* for HYSA/brokerage, not
  provider names. Educational-only disclaimer on every screen and in every explanation.

## 3-minute demo script

1. **(0:00) Hook** — "No incoming intern reads a 21-page finance guide. We turned one — written
   by a former Amazon SWE intern — into an agent." Show the landing page.
2. **(0:20) Zero-setup path** — click **"Load sample statement."** This seeds a realistic
   Amazon-intern statement + sample profile and jumps to the plan. (No live LLM needed — safe
   on stage.)
3. **(0:45) The plan** — walk the waterfall on `/plan`: emergency fund first, then school,
   then Roth IRA — the mandatory priority order from the guide. Then hit the **surplus
   decision**: "once your Roth is maxed, the extra money is a real choice." Drag the sliders
   to split the surplus across **cash / brokerage / Roth 401(k)** and show the plan recompute
   live. Read the tradeoffs the app surfaces — cash = optionality, brokerage = growth but
   taxed, Roth 401(k) = extra tax-free space via rollover but least accessible with a 10%
   early-withdrawal penalty — and point out the **401(k) vesting warning** ("match may not
   vest before you leave — Amazon's multi-year vesting"), straight from the guide.
4. **(1:30) Deterministic math** — open `engine.ts` briefly (or say it): "these numbers are
   coded from the guide and unit-tested — `npm test`, 14 passing. The LLM never touches a
   dollar amount."
5. **(2:00) Live personalization** — click **"Generate explanation"** for the plain-English
   narrative, and/or tweak a goal in the editor to show the plan **recompute instantly**.
6. **(2:30) Privacy + pay-it-forward close** — "Open source, runs locally, your key, your
   data. A former intern's guide, now personalized for the next intern in 5 minutes. That's
   paying it forward."

## Fallback if the network/LLM fails on stage

The demo-critical path — Load sample → `/ingest` spending → `/plan` waterfall + step
rationales — needs no LLM. Only "Generate explanation" and the onboarding chat call Anthropic;
both degrade gracefully to deterministic output.

## Links

- Repo: (public GitHub — MIT licensed, guide included with attribution)
- Guide author: Alexander Lumala, former Amazon SWE intern
