import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";
import { REWRITE_PROMPT, resolvePrompt } from "./prompts";

export default function Rewrite() {
  const prefs = getPreferenceValues<Preferences.Rewrite>();
  return (
    <ResultView
      sys_prompt={resolvePrompt(prefs.prompt_rewrite, REWRITE_PROMPT)}
      wrap_input
      model_override={prefs.openrouter_model_rewrite}
      reasoning_effort={prefs.reasoning_effort_rewrite}
      service_tier={prefs.service_tier_rewrite}
      toast_title="Rewriting..."
    />
  );
}
