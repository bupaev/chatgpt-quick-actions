import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = "You are a helpful assistant.";
const prefs = getPreferenceValues();
const model_override = prefs.model_preview;
const openrouter_model_override = prefs.openrouter_model_preview;
const toast_title = "Thinking...";

export default function Preview() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      openrouter_model_override={openrouter_model_override}
      toast_title={toast_title}
    />
  );
}
