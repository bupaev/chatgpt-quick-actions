import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

// Tiers that are sent; "default" (Standard) means no service_tier parameter
const SERVICE_TIERS = ["flex", "priority", "ultrafast"] as const;
export type ServiceTier = (typeof SERVICE_TIERS)[number];

// OpenRouter-only request fields; service_tier replaces the SDK's narrower OpenAI type
type OpenRouterParams = {
  reasoning?: { effort: ReasoningEffort };
  provider?: { order: string[]; allow_fallbacks?: boolean };
  service_tier?: ServiceTier;
};
export type ChatRequest = Omit<OpenAI.ChatCompletionCreateParamsNonStreaming, "service_tier"> & OpenRouterParams;
export type ChatStreamRequest = Omit<OpenAI.ChatCompletionCreateParamsStreaming, "service_tier"> & OpenRouterParams;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_REFERER = "https://github.com/bupaev/chatgpt-quick-actions";
const OPENROUTER_TITLE = "ChatGPT Quick Actions";

// Generated from package.json into raycast-env.d.ts
function getPreferences() {
  return getPreferenceValues<ExtensionPreferences>();
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

// The casts only widen service_tier: OpenRouter also accepts "ultrafast", which the openai SDK types lack
export function createChatStream(request: ChatStreamRequest, signal?: AbortSignal) {
  return getClient().chat.completions.create(request as OpenAI.ChatCompletionCreateParamsStreaming, { signal });
}

export function createChat(request: ChatRequest) {
  return getClient().chat.completions.create(request as OpenAI.ChatCompletionCreateParamsNonStreaming);
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

// Same resolution as the reasoning effort; undefined means Standard: no service_tier is sent
export function resolveServiceTier(tierOverride?: string): ServiceTier | undefined {
  const value = tierOverride && tierOverride !== "global" ? tierOverride : getPreferences().serviceTier;
  return SERVICE_TIERS.find((tier) => tier === value);
}

// Provider slugs from the preferences, e.g. "google-vertex/europe, amazon-bedrock/eu-west-1"
export function getProviderOrder() {
  return (getPreferences().providerOrder ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

// Extra body fields for every request: reasoning effort, service tier and provider routing
export function openRouterParams(
  effort: ReasoningEffort | undefined,
  serviceTier: ServiceTier | undefined,
): OpenRouterParams {
  const params: OpenRouterParams = {};
  if (effort) {
    params.reasoning = { effort };
  }
  if (serviceTier) {
    params.service_tier = serviceTier;
  }
  const order = getProviderOrder();
  if (order.length > 0) {
    // Fallbacks are OpenRouter's default; only send the flag to turn them off
    params.provider = getPreferences().providerFallbacks === false ? { order, allow_fallbacks: false } : { order };
  }
  return params;
}

// Name of the provider that served the request; OpenRouter adds it to every response and chunk
export function parseProvider(response: object): string | undefined {
  const { provider } = response as { provider?: unknown };
  return typeof provider === "string" && provider ? provider : undefined;
}

// Tier that actually served the request ("default", "flex", "priority", "ultrafast"), from any response or chunk
export function parseServiceTier(response: object): string | undefined {
  const { service_tier } = response as { service_tier?: unknown };
  return typeof service_tier === "string" && service_tier ? service_tier : undefined;
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
