import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_rewrite;
const model_override = prefs.model_rewrite;
const openrouter_model_override = prefs.openrouter_model_rewrite;
const toast_title = "Rewriting...";

export default function Rewrite() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      openrouter_model_override={openrouter_model_override}
      toast_title={toast_title}
    />
  );
}
