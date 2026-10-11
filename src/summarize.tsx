import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";
import { SUMMARIZE_PROMPT, resolvePrompt } from "./prompts";

export default function Summarize() {
  const prefs = getPreferenceValues<Preferences.Summarize>();
  return (
    <ResultView
      sys_prompt={resolvePrompt(prefs.prompt_summarize, SUMMARIZE_PROMPT)}
      wrap_input
      model_override={prefs.openrouter_model_summarize}
      reasoning_effort={prefs.reasoning_effort_summarize}
      toast_title="Summarizing..."
    />
  );
}
