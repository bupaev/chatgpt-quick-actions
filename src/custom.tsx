import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_custom;
const model_override = prefs.model_custom;
const openrouter_model_override = prefs.openrouter_model_custom;
const toast_title = "Thinking...";

export default function CustomAction() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      openrouter_model_override={openrouter_model_override}
      toast_title={toast_title}
    />
  );
}
