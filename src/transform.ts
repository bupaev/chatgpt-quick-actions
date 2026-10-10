import { getPreferenceValues } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

export default async function Command(props: { arguments: { prompt: string } }) {
  const prefs = getPreferenceValues();
  await runNoUICommand({
    action: "Transforming",
    prompt: props.arguments.prompt,
    model_override: prefs.openrouter_model_transform,
    successMessage: "Transformed text pasted.",
  });
}
