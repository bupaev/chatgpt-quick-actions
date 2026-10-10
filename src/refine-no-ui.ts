import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

export default async function RefineNoUI() {
  const prefs = getPreferenceValues<Preferences.RefineNoUi>();
  await runNoUICommand({
    action: "Refining",
    prompt: prefs.prompt_refine_no_ui,
    model_override: prefs.openrouter_model_refine_no_ui,
    reasoning_effort: prefs.reasoning_effort_refine_no_ui,
    successMessage: "Refined text pasted.",
  });
}
