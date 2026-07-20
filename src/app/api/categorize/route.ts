// POST /api/categorize — categorize transactions via Anthropic on Bedrock, with
// a deterministic local fallback. ALWAYS returns HTTP 200 { transactions }.
// Auth uses the machine's AWS credentials; they are NEVER logged.
// See TECHNICAL_PLAN.md §6 / §9.

import { categorizeLocal } from '@/lib/categorize';
import { makeClient, MODEL } from '@/lib/anthropic';
import { categorizeSystem } from '@/lib/prompts';
import { TX_CATEGORIES } from '@/lib/types';
import type { Transaction, TxCategory } from '@/lib/types';

const BATCH_SIZE = 50;

function isValidCategory(value: unknown): value is TxCategory {
  return typeof value === 'string' && (TX_CATEGORIES as string[]).includes(value);
}

/** Pull the first JSON array out of a model response, defensively. */
function extractJsonArray(text: string): unknown[] | null {
  const trimmed = text.trim();
  // Try direct parse first.
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray((parsed as { categories?: unknown }).categories)) {
      return (parsed as { categories: unknown[] }).categories;
    }
  } catch {
    // fall through to bracket extraction
  }
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

/** Categorize a single batch via Anthropic. Throws on any failure so the caller falls back. */
async function categorizeBatch(
  client: ReturnType<typeof makeClient>,
  batch: Transaction[],
): Promise<Transaction[]> {
  const userPayload = batch.map((t, i) => ({
    i,
    date: t.date,
    description: t.description,
    amount: t.amount,
  }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: categorizeSystem(),
    messages: [
      {
        role: 'user',
        content:
          'Categorize each transaction. Reply with ONLY a JSON array of objects ' +
          '{ "i": <index>, "category": <one of ' +
          TX_CATEGORIES.join('|') +
          '> }. Transactions:\n' +
          JSON.stringify(userPayload),
      },
    ],
  });

  // Concatenate any text blocks from the response.
  const text = (response.content ?? [])
    .map((block: { type: string; text?: string }) =>
      block.type === 'text' && typeof block.text === 'string' ? block.text : '',
    )
    .join('');

  const arr = extractJsonArray(text);
  if (!arr) throw new Error('unparseable model response');

  // Start from a local categorization so any index the model missed still gets a category.
  const out = categorizeLocal(batch);
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const idx = (item as { i?: unknown }).i;
    const cat = (item as { category?: unknown }).category;
    if (typeof idx === 'number' && idx >= 0 && idx < out.length && isValidCategory(cat)) {
      out[idx] = { ...out[idx], category: cat };
    }
  }
  return out;
}

export async function POST(req: Request) {
  let transactions: Transaction[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.transactions)) {
      transactions = body.transactions as Transaction[];
    }
  } catch {
    return Response.json({ transactions: [] }, { status: 200 });
  }

  try {
    const client = makeClient();
    const result: Transaction[] = [];
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      const categorized = await categorizeBatch(client, batch);
      result.push(...categorized);
    }
    return Response.json({ transactions: result }, { status: 200 });
  } catch {
    // Any failure (auth, network, parse) -> local fallback. Never log credentials.
    return Response.json({ transactions: categorizeLocal(transactions) }, { status: 200 });
  }
}
