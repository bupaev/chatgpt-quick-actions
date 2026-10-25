import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

export default async function Execute() {
  const prefs = getPreferenceValues<Preferences.Execute>();
  await runNoUICommand({
    action: "Connecting",
    model_override: prefs.openrouter_model_execute,
    reasoning_effort: prefs.reasoning_effort_execute,
    service_tier: prefs.service_tier_execute,
    successMessage: "Response pasted to the current application.",
  });
}
