import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

const prefs = getPreferenceValues();
const model_override = prefs.model_execute;
const openrouter_model_override = prefs.openrouter_model_execute;

export default async function Command() {
  await runNoUICommand({
    action: "Connecting",
    model_override,
    openrouter_model_override,
    successMessage: "Response pasted to the current application.",
  });
}
