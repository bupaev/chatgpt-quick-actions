import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";
import { REFINE_PROMPT, resolvePrompt } from "./prompts";

export default async function RefineNoUI() {
  const prefs = getPreferenceValues<Preferences.RefineNoUi>();
  await runNoUICommand({
    action: "Refining",
    prompt: resolvePrompt(prefs.prompt_refine_no_ui, REFINE_PROMPT),
    wrapInput: true,
    model_override: prefs.openrouter_model_refine_no_ui,
    reasoning_effort: prefs.reasoning_effort_refine_no_ui,
    successMessage: "Refined text pasted.",
  });
}
