import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_rewrite_no_ui;
const model_override = prefs.model_rewrite_no_ui;
const openrouter_model_override = prefs.openrouter_model_rewrite_no_ui;

export default async function RewriteNoUI() {
  await runNoUICommand({
    action: "Rewriting",
    prompt,
    model_override,
    openrouter_model_override,
    successMessage: "Rewritten text pasted.",
  });
}
