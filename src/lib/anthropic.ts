import Anthropic from '@anthropic-ai/sdk';
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';

// LLM auth has two backends, chosen automatically at request time:
//
//   1. Anthropic direct  — used when ANTHROPIC_API_KEY is set. This is the path
//      for the public Vercel deployment: a durable key set in Vercel's env vars
//      (never committed). Works from anywhere.
//   2. Amazon Bedrock    — the fallback for local dev, using the machine's own
//      AWS credential chain (env vars, ~/.aws profiles, SSO, or a role). Nothing
//      leaves the box.
//
// Both @anthropic-ai/sdk and @anthropic-ai/bedrock-sdk expose the same
// `client.messages.create(...)` API and `msg.content` block shape, so the API
// routes never need to know which backend answered.

// Whether the Anthropic-direct backend is active (a key is present).
export const useAnthropicDirect = Boolean(process.env.ANTHROPIC_API_KEY);

// The model id must match the active backend:
//   - Anthropic direct wants a plain model id (e.g. "claude-sonnet-5").
//   - Bedrock wants a model id / cross-region inference profile
//     (e.g. "global.anthropic.claude-sonnet-5").
// Override either with the matching env var if your account needs a different one.
export const MODEL = useAnthropicDirect
  ? (process.env.ANTHROPIC_MODEL_ID ?? 'claude-sonnet-5')
  : (process.env.BEDROCK_MODEL_ID ?? 'global.anthropic.claude-sonnet-5');

// The AWS region Bedrock is called in (Bedrock backend only).
const REGION =
  process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';

// The Messages API surface both clients share, so callers can stay backend-agnostic.
export type LlmClient = Pick<Anthropic, 'messages'> | Pick<AnthropicBedrock, 'messages'>;

// Build the active client. Prefers the Anthropic-direct key; falls back to
// Bedrock's default AWS provider chain. We never take a key as an argument or
// read one from a request header — nothing is logged.
export function makeClient(): LlmClient {
  if (useAnthropicDirect) {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return new AnthropicBedrock({ awsRegion: REGION });
}
