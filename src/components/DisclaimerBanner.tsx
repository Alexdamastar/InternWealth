// Persistent educational-only banner. Required on every page per §12.4.
export default function DisclaimerBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm px-4 py-2 text-center">
      <span className="font-medium">Educational only</span> — InternWealth is not
      licensed financial advice. Investing involves risk. You are responsible for
      your own decisions.
    </div>
  );
}
