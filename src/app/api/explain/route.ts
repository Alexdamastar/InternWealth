import { NextResponse } from 'next/server';
import { makeClient, MODEL } from '@/lib/anthropic';
import { explainSystem } from '@/lib/prompts';
import type {
  AllocationResult,
  Goal,
  UserProfile,
  TxCategory,
} from '@/lib/types';

interface ExplainRequest {
  allocation: AllocationResult;
  goals: Goal[];
  profile: UserProfile;
  spendingByCategory: Record<TxCategory, number>;
}

// POST /api/explain
// Input JSON body: { allocation, goals, profile, spendingByCategory }
// Auth uses the machine's AWS credentials via Bedrock — no key in the request.
// On success: { explanation: string }.
// On any error: HTTP 200 with { explanation: null, error: string } so the client
// can gracefully fall back to engine rationale strings.
// NEVER log AWS credentials or the full request body.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExplainRequest;
    const userPayload = {
      allocation: body.allocation,
      goals: body.goals,
      profile: body.profile,
      spendingByCategory: body.spendingByCategory,
    };

    const client = makeClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: explainSystem(),
      messages: [{ role: 'user', content: JSON.stringify(userPayload) }],
    });

    const explanation = msg.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    return NextResponse.json({ explanation });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json({ explanation: null, error });
  }
}
