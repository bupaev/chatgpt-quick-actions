import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Summarize() {
  const prefs = getPreferenceValues<Preferences.Summarize>();
  return (
    <ResultView
      sys_prompt={prefs.prompt_summarize}
      model_override={prefs.openrouter_model_summarize}
      reasoning_effort={prefs.reasoning_effort_summarize}
      toast_title="Summarizing..."
    />
  );
}
