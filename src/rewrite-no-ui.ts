import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

export default async function RewriteNoUI() {
  const prefs = getPreferenceValues<Preferences.RewriteNoUi>();
  await runNoUICommand({
    action: "Rewriting",
    prompt: prefs.prompt_rewrite_no_ui,
    model_override: prefs.openrouter_model_rewrite_no_ui,
    reasoning_effort: prefs.reasoning_effort_rewrite_no_ui,
    successMessage: "Rewritten text pasted.",
  });
}
