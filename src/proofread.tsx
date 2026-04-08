import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_proofread;
const model_override = prefs.model_proofread;
const openrouter_model_override = prefs.openrouter_model_proofread;
const toast_title = "Proofreading...";

export default function Proofread() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      openrouter_model_override={openrouter_model_override}
      toast_title={toast_title}
    />
  );
}
