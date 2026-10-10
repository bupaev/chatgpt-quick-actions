import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { runNoUICommand } from "./no_ui";

export default async function Transform(props: LaunchProps<{ arguments: Arguments.Transform }>) {
  const prefs = getPreferenceValues<Preferences.Transform>();
  await runNoUICommand({
    action: "Transforming",
    prompt: props.arguments.prompt,
    model_override: prefs.openrouter_model_transform,
    reasoning_effort: prefs.reasoning_effort_transform,
    successMessage: "Transformed text pasted.",
  });
}
