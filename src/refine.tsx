import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prefs = getPreferenceValues();
const prompt = prefs.prompt_refine;
const model_override = prefs.openrouter_model_refine;
const reasoning_effort = prefs.reasoning_effort_refine;
const toast_title = "Refining...";

export default function Refine() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      reasoning_effort={reasoning_effort}
      toast_title={toast_title}
    />
  );
}
