import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Proofread() {
  const prefs = getPreferenceValues<Preferences.Proofread>();
  return (
    <ResultView
      sys_prompt={prefs.prompt_proofread}
      model_override={prefs.openrouter_model_proofread}
      reasoning_effort={prefs.reasoning_effort_proofread}
      toast_title="Proofreading..."
    />
  );
}
