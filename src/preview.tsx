import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Preview() {
  const prefs = getPreferenceValues<Preferences.Preview>();
  return (
    <ResultView
      sys_prompt="You are a helpful assistant."
      model_override={prefs.openrouter_model_preview}
      reasoning_effort={prefs.reasoning_effort_preview}
      service_tier={prefs.service_tier_preview}
      toast_title="Thinking..."
    />
  );
}
