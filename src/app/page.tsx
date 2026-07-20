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
    <div className="space-y-8">
      <section className="pt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Turn a 21-page finance guide into a 5-minute plan.
        </h1>
        <p className="text-gray-700 max-w-2xl leading-relaxed">
          InternWealth is a locally-run, open-source financial agent for incoming
          SWE interns. Answer a few questions, upload your bank transactions, and
          get a <strong>deterministic, personalized allocation plan</strong> —
          emergency fund, school-year expenses, Roth IRA, 401(k), and brokerage —
          plus a plain-English explanation. The knowledge base is a real financial
          guide written by a former Amazon SWE intern.
        </p>
        <p className="text-gray-500 text-sm max-w-2xl mt-3 italic">
          &ldquo;No incoming intern reads 21 pages. So we turned that guide into an
          agent that personalizes it to your actual numbers in 5 minutes.
          That&apos;s paying it forward.&rdquo;
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/onboarding"
          className="bg-indigo-600 text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-indigo-700"
        >
          Start — set my goals
        </Link>
        <button
          onClick={loadSample}
          className="bg-white border border-gray-300 rounded-md px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Load sample statement (zero-setup demo)
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 pt-4">
        <Feature
          title="Math is deterministic"
          body="The allocation waterfall is coded TypeScript straight from the guide. The LLM never computes a dollar amount — numbers are correct and reproducible."
        />
        <Feature
          title="Runs locally, BYO key"
          body="No server we own. Your statements and goals live only on your machine. The only thing that leaves is text you send to Anthropic under your own key."
        />
        <Feature
          title="Works without an LLM"
          body="Categorization has a keyword fallback and the plan renders from deterministic rationales, so the core demo never depends on a live API call."
        />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}
