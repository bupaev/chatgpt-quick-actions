import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_rewrite_no_ui;
const model_override = prefs.openrouter_model_rewrite_no_ui;
const reasoning_effort = prefs.reasoning_effort_rewrite_no_ui;

export default async function RewriteNoUI() {
  await runNoUICommand({
    action: "Rewriting",
    prompt,
    model_override,
    reasoning_effort,
    successMessage: "Rewritten text pasted.",
  });
}
