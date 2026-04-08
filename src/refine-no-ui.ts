import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_refine_no_ui;
const model_override = prefs.model_refine_no_ui;
const openrouter_model_override = prefs.openrouter_model_refine_no_ui;

export default async function RefineNoUI() {
  await runNoUICommand({
    action: "Refining",
    prompt,
    model_override,
    openrouter_model_override,
    successMessage: "Refined text pasted.",
  });
}
