import type { RequestUsage } from "./api";

// OpenRouter reports cost in credits; 1 credit = 1 USD
export function formatCostUSD(cost: number) {
  return `$${cost.toFixed(6)}`;
}

// e.g. "1,261 in · 13 out (10 reasoning)"; reasoning tokens are part of the output tokens
export function formatTokens(usage: RequestUsage) {
  const format = (n: number) => n.toLocaleString("en-US");
  const reasoning = usage.reasoningTokens > 0 ? ` (${format(usage.reasoningTokens)} reasoning)` : "";
  return `${format(usage.promptTokens)} in · ${format(usage.completionTokens)} out${reasoning}`;
}
