import Anthropic from "@anthropic-ai/sdk";

declare global {
  var __cc_anthropic: Anthropic | undefined;
}

export const anthropic =
  globalThis.__cc_anthropic ??
  (globalThis.__cc_anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

export const SCRIPT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
