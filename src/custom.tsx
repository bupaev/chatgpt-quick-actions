import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function CustomAction() {
  const prefs = getPreferenceValues<Preferences.Custom>();
  return (
    <ResultView
      sys_prompt={prefs.prompt_custom}
      model_override={prefs.openrouter_model_custom}
      reasoning_effort={prefs.reasoning_effort_custom}
      toast_title="Thinking..."
    />
  );
}
