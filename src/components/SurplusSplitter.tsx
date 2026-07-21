'use client';

// The post-Roth surplus decision. Once the Roth IRA is maxed, the intern splits
// the leftover across cash / brokerage / 401(k) in ANY proportion. Sliders set
// relative weights; the engine turns them into exact dollar amounts. Each option
// shows deterministic pros/cons so the choice is informed with zero LLM calls.

import type { SurplusChoice, SurplusOption, SurplusSplit } from '@/lib/types';

const CHOICES: SurplusChoice[] = ['cash', 'brokerage', '401k'];

const COLORS: Record<SurplusChoice, string> = {
  cash: '#eb6834',
  brokerage: '#1baf7a',
  '401k': '#eda100',
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  surplus: number;
  split: SurplusSplit; // current weights (0-100 each)
  amounts: SurplusSplit; // dollar amounts the engine computed
  options: SurplusOption[];
  onChange: (split: SurplusSplit) => void;
}

export default function SurplusSplitter({
  surplus,
  split,
  amounts,
  options,
  onChange,
}: Props) {
  if (surplus <= 0) return null;

  const total = CHOICES.reduce((sum, c) => sum + Math.max(0, split[c] ?? 0), 0);

  function setWeight(choice: SurplusChoice, value: number) {
    onChange({ ...split, [choice]: Math.max(0, value) });
  }

  function preset(next: SurplusSplit) {
    onChange(next);
  }

  return (
    <div className="bg-card border border-line shadow-card p-5 space-y-4">
      <div>
        <h3 className="font-display font-semibold text-lg">
          Your surplus: <span className="text-moss">{usd(surplus)}</span>
        </h3>
        <p className="text-sm text-ink-2 mt-1 leading-relaxed">
          Your Roth IRA is maxed, so this is extra money. Split it however you
          like across the three options below — the plan recomputes instantly.
          There&apos;s no single right answer; it&apos;s a tradeoff between
          accessibility, growth, and taxes.
        </p>
      </div>

      {/* Quick presets for common splits */}
      <div className="flex flex-wrap gap-2">
        <Preset label="All brokerage" onClick={() => preset({ cash: 0, brokerage: 100, '401k': 0 })} />
        <Preset label="All cash" onClick={() => preset({ cash: 100, brokerage: 0, '401k': 0 })} />
        <Preset label="All Roth 401(k)" onClick={() => preset({ cash: 0, brokerage: 0, '401k': 100 })} />
        <Preset label="½ cash · ½ 401(k)" onClick={() => preset({ cash: 50, brokerage: 0, '401k': 50 })} />
        <Preset label="Even split" onClick={() => preset({ cash: 34, brokerage: 33, '401k': 33 })} />
      </div>

      {/* Sliders + tradeoffs per option */}
      <div className="space-y-4">
        {options.map((opt) => {
          const weight = Math.max(0, split[opt.choice] ?? 0);
          const pct = total > 0 ? Math.round((weight / total) * 100) : 0;
          return (
            <div key={opt.choice} className="border border-line p-3.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5"
                    style={{ backgroundColor: COLORS[opt.choice] }}
                  />
                  <span className="text-sm font-semibold capitalize">
                    {opt.choice === '401k' ? 'Roth 401(k)' : opt.choice}
                  </span>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {usd(amounts[opt.choice] ?? 0)}{' '}
                  <span className="text-xs text-faint font-normal">({pct}%)</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(opt.choice, Number(e.target.value))}
                className="w-full"
                aria-label={`${opt.choice} weight`}
              />
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                <ul className="text-xs text-good space-y-1">
                  {opt.pros.map((p, i) => (
                    <li key={i}>+ {p}</li>
                  ))}
                </ul>
                <ul className="text-xs text-bad space-y-1">
                  {opt.cons.map((c, i) => (
                    <li key={i}>− {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {total === 0 && (
        <p className="text-xs text-warn-text">
          All sliders are at zero — the surplus defaults to the taxable brokerage
          until you set a split.
        </p>
      )}
    </div>
  );
}

function Preset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold border border-ink/25 rounded-full px-3 py-1 hover:border-moss hover:text-moss transition-colors"
    >
      {label}
    </button>
  );
}
