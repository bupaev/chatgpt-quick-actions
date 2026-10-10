import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

type Preferences = {
  openrouterApiKey?: string;
  openrouterModel?: string;
  openrouterSmartModel?: string;
  reasoningEffort?: string;
};

const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

// OpenRouter's unified reasoning control; not part of the openai SDK types
type OpenRouterParams = { reasoning?: { effort: ReasoningEffort } };
export type ChatRequest = OpenAI.ChatCompletionCreateParamsNonStreaming & OpenRouterParams;
export type ChatStreamRequest = OpenAI.ChatCompletionCreateParamsStreaming & OpenRouterParams;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_REFERER = "https://github.com/bupaev/chatgpt-quick-actions";
const OPENROUTER_TITLE = "ChatGPT Quick Actions";

function getPreferences() {
  return getPreferenceValues<Preferences>();
}

function requirePreference(value: string | undefined, title: string) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw new Error(`Set ${title} in the extension preferences.`);
  }
  return trimmedValue;
}

// OpenRouter exposes an OpenAI-compatible API, so the openai SDK is used as the client
export function getClient() {
  return new OpenAI({
    apiKey: requirePreference(getPreferences().openrouterApiKey, "OpenRouter API Key"),
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
  });
}

export function getGlobalModel() {
  return requirePreference(getPreferences().openrouterModel, "Model ID");
}

// Model for "Retry with Smartest Model"; undefined when not configured
export function getSmartModel() {
  return getPreferences().openrouterSmartModel?.trim() || undefined;
}

// Command override ("global" = follow the global setting) wins over the global effort.
// undefined means "Model Default": no reasoning parameter is sent.
export function resolveReasoningEffort(effortOverride?: string): ReasoningEffort | undefined {
  const value = effortOverride && effortOverride !== "global" ? effortOverride : getPreferences().reasoningEffort;
  return REASONING_EFFORTS.find((effort) => effort === value);
}

export function reasoningParams(effort: ReasoningEffort | undefined): OpenRouterParams {
  return effort ? { reasoning: { effort } } : {};
}

// Command-level override wins over the global model
export function resolveModel(modelOverride?: string) {
  return modelOverride?.trim() || getGlobalModel();
}

// Token counts and cost that OpenRouter attaches to every response (the last chunk when streaming)
export interface RequestUsage {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  // In credits (1 credit = 1 USD); missing if OpenRouter did not report it
  cost?: number;
}

type OpenRouterUsage = OpenAI.CompletionUsage & { cost?: number };

export function parseUsage(usage: OpenAI.CompletionUsage | null | undefined): RequestUsage | undefined {
  if (!usage) return undefined;
  const { cost } = usage as OpenRouterUsage;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
    cost: typeof cost === "number" ? cost : undefined,
  };
}
