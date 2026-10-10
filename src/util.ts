import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import type { RequestUsage } from "./api";

function escapeStringForAppleScript(str: string) {
  return str.replace(/[\\"]/g, "\\$&");
}

export async function sendToSideNote(content: string) {
  const applescript = `
  tell application "SideNotes"
    set f to first folder
    make new note in f with properties { text: "${escapeStringForAppleScript(content.trim())}" }
  end tell
  `;
  await runAppleScriptSilently(applescript);
}

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

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
