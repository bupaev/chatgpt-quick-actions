import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";
import { REWRITE_PROMPT, resolvePrompt } from "./prompts";

export default async function RewriteNoUI() {
  const prefs = getPreferenceValues<Preferences.RewriteNoUi>();
  await runNoUICommand({
    action: "Rewriting",
    prompt: resolvePrompt(prefs.prompt_rewrite_no_ui, REWRITE_PROMPT),
    wrapInput: true,
    model_override: prefs.openrouter_model_rewrite_no_ui,
    reasoning_effort: prefs.reasoning_effort_rewrite_no_ui,
    successMessage: "Rewritten text pasted.",
  });
}
