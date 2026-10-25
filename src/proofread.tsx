import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";
import { PROOFREAD_PROMPT, resolvePrompt } from "./prompts";

export default function Proofread() {
  const prefs = getPreferenceValues<Preferences.Proofread>();
  return (
    <ResultView
      sys_prompt={resolvePrompt(prefs.prompt_proofread, PROOFREAD_PROMPT)}
      wrap_input
      model_override={prefs.openrouter_model_proofread}
      reasoning_effort={prefs.reasoning_effort_proofread}
      service_tier={prefs.service_tier_proofread}
      toast_title="Proofreading..."
    />
  );
}
