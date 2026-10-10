import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

export default async function ProofreadNoUI() {
  const prefs = getPreferenceValues<Preferences.ProofreadNoUi>();
  await runNoUICommand({
    action: "Proofreading",
    prompt: prefs.prompt_proofread_no_ui,
    model_override: prefs.openrouter_model_proofread_no_ui,
    reasoning_effort: prefs.reasoning_effort_proofread_no_ui,
    successMessage: "Proofread text pasted.",
  });
}
