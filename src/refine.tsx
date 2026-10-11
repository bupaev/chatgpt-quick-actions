import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";
import { REFINE_PROMPT, resolvePrompt } from "./prompts";

export default function Refine() {
  const prefs = getPreferenceValues<Preferences.Refine>();
  return (
    <ResultView
      sys_prompt={resolvePrompt(prefs.prompt_refine, REFINE_PROMPT)}
      wrap_input
      model_override={prefs.openrouter_model_refine}
      reasoning_effort={prefs.reasoning_effort_refine}
      toast_title="Refining..."
    />
  );
}
