import { NextResponse } from 'next/server';
import { z } from 'zod';
import { makeClient, MODEL, getKeyFromRequest } from '@/lib/anthropic';
import { chatSystem } from '@/lib/prompts';
import type { ChatMessage, Goal, UserProfile } from '@/lib/types';

interface ChatRequest {
  messages: ChatMessage[];
}

// Zod schemas built inline to match types.ts exactly. Numeric strings are coerced
// so we're robust to the LLM emitting "9000" instead of 9000. Extra fields the
// model might add are ignored. Booleans are coerced from common string/number
// forms the LLM occasionally emits ("false", 0) so a stray type doesn't drop the
// whole working plan.
const looseBool = z.preprocess((v) => {
  if (typeof v === 'string') return v.trim().toLowerCase() === 'true' || v.trim() === '1';
  if (typeof v === 'number') return v !== 0;
  return v;
}, z.boolean());

const profileSchema = z.object({
  monthlyIncome: z.coerce.number(),
  essentialMonthlyExpenses: z.coerce.number(),
  schoolYearMonthlyExpenses: z.coerce.number().optional(),
  hasEmergencyFund: z.coerce.number(),
  employer401kVests: looseBool,
  rothContributedThisYear: z.coerce.number(),
  workState: z.string(),
  internshipEndsSoon: looseBool,
});

const goalSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  targetAmount: z.coerce.number().optional(),
  priority: z.coerce.number(),
  kind: z.enum(['emergency', 'school', 'roth', '401k', 'brokerage', 'custom']),
});

// The working plan the LLM maintains on the side. `summary` and `complete` are
// optional so an early/partial block still parses into a usable profile+goals.
const workingPlanSchema = z.object({
  summary: z.string().optional(),
  profile: profileSchema,
  goals: z.array(goalSchema),
  complete: looseBool.optional(),
});

// Pull the first fenced ```json ... ``` block out of the reply text.
function extractJsonBlock(reply: string): string | null {
  const match = reply.match(/```json\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}

// POST /api/chat
// Input JSON body: { messages: ChatMessage[] } (already role/content shaped).
// Key comes from the 'x-anthropic-key' header.
// On success: { reply: string, workingPlan?: { summary, profile, goals, complete } }.
//   The LLM emits a working-plan json block every turn; we parse it into a live
//   plan the UI renders on the side. `complete` gates the "Continue" button.
// On missing key: HTTP 200 { reply: null, error: 'no-key' }.
// On Anthropic error: HTTP 200 { reply: null, error: string }.
// NEVER log the key or the full request body.
export async function POST(req: Request) {
  const apiKey = getKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json({ reply: null, error: 'no-key' });
  }

  try {
    const body = (await req.json()) as ChatRequest;
    const messages = body.messages ?? [];

    const client = makeClient(apiKey);
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: chatSystem(),
      messages,
    });

    const reply = msg.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    // Best-effort parse of the working-plan block. On any failure, omit
    // `workingPlan` but keep the reply so the chat still flows.
    const jsonBlock = extractJsonBlock(reply);
    if (jsonBlock) {
      try {
        const parsed = workingPlanSchema.parse(JSON.parse(jsonBlock));
        const goals: Goal[] = parsed.goals.map((g, index) => ({
          id: g.id && g.id.trim() !== '' ? g.id : `g-${index}`,
          label: g.label,
          ...(g.targetAmount !== undefined ? { targetAmount: g.targetAmount } : {}),
          priority: g.priority,
          kind: g.kind,
        }));
        const profile: UserProfile = parsed.profile;
        return NextResponse.json({
          reply,
          workingPlan: {
            summary: parsed.summary ?? '',
            profile,
            goals,
            complete: parsed.complete ?? false,
          },
        });
      } catch {
        // fall through — return reply without a working plan
      }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json({ reply: null, error });
  }
}
