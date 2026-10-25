import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";
import { DEFINE_PROMPT, resolvePrompt } from "./prompts";

export default function CustomAction() {
  const prefs = getPreferenceValues<Preferences.Custom>();
  return (
    <ResultView
      sys_prompt={resolvePrompt(prefs.prompt_custom, DEFINE_PROMPT)}
      wrap_input
      model_override={prefs.openrouter_model_custom}
      reasoning_effort={prefs.reasoning_effort_custom}
      service_tier={prefs.service_tier_custom}
      toast_title="Thinking..."
    />
  );
}
