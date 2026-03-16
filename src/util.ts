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

// Prices are per 1M tokens in dollars, converted to cents
export function estimatePrice(input_token: number, output_token: number, model: string) {
  let price = 0;

  if (model == "gpt-5.4-pro") {
    price = (input_token * 30.0 + output_token * 180.0) / 10000;
  } else if (model == "gpt-5.4" || model == "o3") {
    price = (input_token * 2.5 + output_token * 15.0) / 10000;
  } else if (model == "gpt-5") {
    price = (input_token * 1.25 + output_token * 10.0) / 10000;
  } else if (model == "gpt-5-mini") {
    price = (input_token * 0.25 + output_token * 2.0) / 10000;
  } else if (model == "gpt-5-nano") {
    price = (input_token * 0.05 + output_token * 0.4) / 10000;
  } else if (model == "o1-pro") {
    price = (input_token * 15.0 + output_token * 120.0) / 10000;
  } else if (model == "o1") {
    price = (input_token * 1.25 + output_token * 10.0) / 10000;
  } else if (model == "gpt-4.1") {
    price = (input_token * 3.0 + output_token * 12.0) / 10000;
  } else if (model == "gpt-4.1-mini") {
    price = (input_token * 0.8 + output_token * 3.2) / 10000;
  } else if (model == "gpt-4.1-nano") {
    price = (input_token * 0.2 + output_token * 0.8) / 10000;
  } else {
    return -1;
  }
  return naiveRound(price, 5);
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
