// Persistent educational-only banner. Required on every page per §12.4.
export default function DisclaimerBanner() {
  return (
    <div className="w-full bg-ink text-paper/90 text-[11px] sm:text-xs px-4 py-1.5 text-center tracking-wide">
      <span className="font-semibold text-paper">Educational only</span> — not
      licensed financial advice. Investing involves risk. You are responsible for
      your own decisions.
    </div>
  );
}
