import Anthropic from '@anthropic-ai/sdk';

// The user brings their own Anthropic API key, sent per-request. Never log it.
export const MODEL = 'claude-opus-4-8';

// Header convention for passing the per-request key. Used consistently everywhere.
export const KEY_HEADER = 'x-anthropic-key';

export function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// Reads the caller-supplied Anthropic key from the request header. Returns null
// when absent so callers can gracefully fall back. Never log the returned value.
export function getKeyFromRequest(req: Request): string | null {
  const key = req.headers.get(KEY_HEADER);
  if (!key || key.trim() === '') return null;
  return key;
}
