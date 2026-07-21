// Provenance badges (feature 4.2): visually distinguish engine-produced
// content (computed) from LLM-produced content (explained). One CSS
// treatment, zero logic — makes the "LLM never touches a number" claim
// inspectable rather than asserted.

export function ComputedBadge() {
  return (
    <span
      title="Produced by the deterministic engine — pure, tested TypeScript. No LLM."
      className="inline-flex items-center gap-1 border border-moss/40 bg-moss/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-moss select-none"
    >
      ⚙ computed
    </span>
  );
}

export function ExplainedBadge() {
  return (
    <span
      title="Written by the LLM. It only rephrases numbers the engine computed — it never derives its own."
      className="inline-flex items-center gap-1 border border-ink/20 bg-paper/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-2 select-none"
    >
      ✨ explained
    </span>
  );
}
