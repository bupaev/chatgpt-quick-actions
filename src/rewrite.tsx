import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Rewrite() {
  const prefs = getPreferenceValues<Preferences.Rewrite>();
  return (
    <ResultView
      sys_prompt={prefs.prompt_rewrite}
      model_override={prefs.openrouter_model_rewrite}
      reasoning_effort={prefs.reasoning_effort_rewrite}
      toast_title="Rewriting..."
    />
  );
}
