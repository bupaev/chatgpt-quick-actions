import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

const prefs = getPreferenceValues();
const model_override = prefs.openrouter_model_execute;
const reasoning_effort = prefs.reasoning_effort_execute;

export default async function Command() {
  await runNoUICommand({
    action: "Connecting",
    model_override,
    reasoning_effort,
    successMessage: "Response pasted to the current application.",
  });
}
