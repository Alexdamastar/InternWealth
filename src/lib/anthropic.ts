import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';

// The LLM features run through Amazon Bedrock using the machine's own AWS
// credentials (the standard AWS credential chain — env vars, ~/.aws profiles,
// SSO, or an instance/container role). Since the app runs locally, those
// credentials never leave the box. Nothing is committed or logged.
//
// Model is a Bedrock model ID / cross-region inference profile. Override with
// BEDROCK_MODEL_ID (e.g. a region-specific profile like
// "us.anthropic.claude-sonnet-5") if your account needs it.
export const MODEL = process.env.BEDROCK_MODEL_ID ?? 'global.anthropic.claude-sonnet-5';

// The AWS region Bedrock is called in. Falls back through the usual env vars.
const REGION =
  process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';

// Build a Bedrock-backed Anthropic client. Credentials come from the default
// AWS provider chain — we never take them as an argument or read a header.
export function makeClient(): AnthropicBedrock {
  return new AnthropicBedrock({ awsRegion: REGION });
}
