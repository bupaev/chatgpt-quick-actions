import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_refine;
const model_override = prefs.model_refine;
const openrouter_model_override = prefs.openrouter_model_refine;
const toast_title = "Rewriting...";

export default function Refine() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      openrouter_model_override={openrouter_model_override}
      toast_title={toast_title}
    />
  );
}
