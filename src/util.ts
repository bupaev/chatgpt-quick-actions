import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { encode } from "@nem035/gpt-3-encoder";

function escapeStringForAppleScript(str: string) {
  return str.replace(/[\\"]/g, "\\$&");
}

export async function sentToSideNote(content: string) {
  const applescript = `
  tell application "SideNotes"
    set f to first folder
    make new note in f with properties { text: "${escapeStringForAppleScript(content.trim())}" }
  end tell
  `;
  await runAppleScriptSilently(applescript);
}

function naiveRound(num: number, decimalPlaces = 0) {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
}

export function countToken(content: string) {
  return encode(content).length;
}

interface EstimatePriceOptions {
  openrouterInputPrice?: string;
  openrouterOutputPrice?: string;
  // Manual prices apply only to this model (the global OpenRouter model)
  openrouterModel?: string;
}

export function formatPriceUSD(priceInCents: number) {
  return `$${(priceInCents / 100).toFixed(6)}`;
}

// Manual prices are per 1M tokens in dollars, converted to cents; -1 when unknown
export function estimatePrice(
  input_token: number,
  output_token: number,
  model: string,
  options?: EstimatePriceOptions,
) {
  if (model !== options?.openrouterModel?.trim()) {
    return -1;
  }
  const inputPrice = Number(options?.openrouterInputPrice);
  const outputPrice = Number(options?.openrouterOutputPrice);

  if (!Number.isFinite(inputPrice) || !Number.isFinite(outputPrice) || inputPrice < 0 || outputPrice < 0) {
    return -1;
  }

  const price = (input_token * inputPrice + output_token * outputPrice) / 10000;
  return naiveRound(price, 5);
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
