import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Refine() {
  const prefs = getPreferenceValues<Preferences.Refine>();
  return (
    <ResultView
      sys_prompt={prefs.prompt_refine}
      model_override={prefs.openrouter_model_refine}
      reasoning_effort={prefs.reasoning_effort_refine}
      toast_title="Refining..."
    />
  );
}
