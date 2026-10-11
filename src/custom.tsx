import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";
import { REFINE_PROMPT, resolvePrompt } from "./prompts";

export default function CustomAction() {
  const prefs = getPreferenceValues<Preferences.Custom>();
  return (
    <ResultView
      sys_prompt={resolvePrompt(prefs.prompt_custom, REFINE_PROMPT)}
      wrap_input
      model_override={prefs.openrouter_model_custom}
      reasoning_effort={prefs.reasoning_effort_custom}
      toast_title="Thinking..."
    />
  );
}
