import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = "You are a helpful assistant.";
const prefs = getPreferenceValues();
const model_override = prefs.openrouter_model_preview;
const reasoning_effort = prefs.reasoning_effort_preview;
const toast_title = "Thinking...";

export default function Preview() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      reasoning_effort={reasoning_effort}
      toast_title={toast_title}
    />
  );
}
