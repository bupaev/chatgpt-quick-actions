import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_summarize;
const model_override = prefs.model_summarize;
const openrouter_model_override = prefs.openrouter_model_summarize;
const toast_title = "Summarizing...";

export default function Summarize() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      openrouter_model_override={openrouter_model_override}
      toast_title={toast_title}
    />
  );
}
