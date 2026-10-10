import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_refine_no_ui;
const model_override = prefs.openrouter_model_refine_no_ui;
const reasoning_effort = prefs.reasoning_effort_refine_no_ui;

export default async function RefineNoUI() {
  await runNoUICommand({
    action: "Refining",
    prompt,
    model_override,
    reasoning_effort,
    successMessage: "Refined text pasted.",
  });
}
