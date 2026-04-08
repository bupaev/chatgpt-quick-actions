import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_proofread_no_ui;
const model_override = prefs.model_proofread_no_ui;
const openrouter_model_override = prefs.openrouter_model_proofread_no_ui;

export default async function ProofreadNoUI() {
  await runNoUICommand({
    action: "Proofreading",
    prompt,
    model_override,
    openrouter_model_override,
    successMessage: "Proofread text pasted.",
  });
}
