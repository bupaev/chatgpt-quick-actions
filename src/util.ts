import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

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

// OpenRouter reports cost in credits; 1 credit = 1 USD
export function formatCostUSD(cost: number) {
  return `$${cost.toFixed(6)}`;
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
