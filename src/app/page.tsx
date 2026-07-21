'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setProfile, setGoals, setTransactions } from '@/lib/storage';
import { SAMPLE_PROFILE, SAMPLE_GOALS } from '@/lib/sample';
import { parseCsv } from '@/lib/csv';
import { categorizeLocal } from '@/lib/categorize';

export default function Home() {
  const router = useRouter();

  async function loadSample() {
    // Load the bundled sample statement, categorize locally (no LLM needed),
    // and seed a sample profile + goals so the demo never depends on a live
    // LLM round-trip. Then jump straight to the plan.
    const res = await fetch('/sample-statement.csv');
    const text = await res.text();
    const txns = categorizeLocal(parseCsv(text));
    setTransactions(txns);
    setProfile(SAMPLE_PROFILE);
    setGoals(SAMPLE_GOALS);
    router.push('/plan');
  }

  return (
    <div>
      {/* Hero — oversized serif, ledger-rule underline, asymmetric layout */}
      <section className="pt-10 pb-14 rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-5">
          A field guide to your first real paycheck
        </p>
        <h1 className="font-display font-semibold text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.04] tracking-tight max-w-3xl text-balance">
          Turn a 21-page finance guide into a{' '}
          <em className="text-moss not-italic border-b-4 border-moss/30">
            5-minute plan.
          </em>
        </h1>
        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_minmax(240px,300px)] lg:gap-14 items-start">
          <p className="text-ink-2 leading-relaxed text-lg max-w-2xl">
            InternWealth is a locally-run, open-source financial agent for
            incoming SWE interns. Answer a few questions, upload your bank
            transactions, and get a{' '}
            <strong className="text-ink">
              deterministic, personalized allocation plan
            </strong>{' '}
            — emergency fund, school-year expenses, Roth IRA, 401(k), and
            brokerage — plus a plain-English explanation.
          </p>
          <blockquote className="border-l-2 border-moss/40 pl-4 text-sm text-faint italic leading-relaxed">
            &ldquo;No incoming intern reads 21 pages. So we turned that guide
            into an agent that personalizes it to your actual numbers in 5
            minutes. That&apos;s paying it forward.&rdquo;
          </blockquote>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-9">
          <Link
            href="/onboarding"
            className="bg-moss text-paper px-7 py-3 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors shadow-card"
          >
            Start — set my goals →
          </Link>
          <button
            onClick={loadSample}
            className="px-7 py-3 text-sm font-semibold text-ink border border-ink/25 hover:border-ink hover:bg-card transition-colors"
          >
            Load sample statement
          </button>
          <span className="text-xs text-faint">zero-setup demo, no AWS access needed</span>
        </div>
      </section>

      {/* Ledger rule */}
      <div className="border-t-2 border-ink/80" />
      <div className="border-t border-ink/30 mt-[3px]" />

      {/* Principles — numbered ledger entries instead of cards */}
      <section className="grid sm:grid-cols-3 gap-x-10 gap-y-8 pt-10 pb-6">
        <Principle
          n="01"
          title="Math is deterministic"
          body="The allocation waterfall is coded TypeScript straight from the guide. The LLM never computes a dollar amount — numbers are correct and reproducible."
          delay="0.1s"
        />
        <Principle
          n="02"
          title="Your data, your AWS account"
          body="No server we own. Your statements and goals live only on your machine, and the AI runs on Amazon Bedrock under your own AWS credentials — Bedrock doesn't store your prompts or train on them."
          delay="0.2s"
        />
        <Principle
          n="03"
          title="AI where it helps, math where it counts"
          body="Claude handles the chat onboarding, transaction categorization, and plain-English writeup; the allocation itself is deterministic. If Bedrock is down, local fallbacks keep every screen working."
          delay="0.3s"
        />
      </section>
    </div>
  );
}

function Principle({
  n,
  title,
  body,
  delay,
}: {
  n: string;
  title: string;
  body: string;
  delay: string;
}) {
  return (
    <div className="rise" style={{ animationDelay: delay }}>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-xs text-moss">{n}</span>
        <h3 className="font-display font-semibold text-lg text-ink">{title}</h3>
      </div>
      <p className="text-sm text-ink-2 leading-relaxed">{body}</p>
    </div>
  );
}
