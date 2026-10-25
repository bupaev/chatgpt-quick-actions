import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";
import { PROOFREAD_PROMPT, resolvePrompt } from "./prompts";

export default async function ProofreadNoUI() {
  const prefs = getPreferenceValues<Preferences.ProofreadNoUi>();
  await runNoUICommand({
    action: "Proofreading",
    prompt: resolvePrompt(prefs.prompt_proofread_no_ui, PROOFREAD_PROMPT),
    wrapInput: true,
    model_override: prefs.openrouter_model_proofread_no_ui,
    reasoning_effort: prefs.reasoning_effort_proofread_no_ui,
    service_tier: prefs.service_tier_proofread_no_ui,
    successMessage: "Proofread text pasted.",
  });
}
