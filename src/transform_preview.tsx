import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Command(props: { arguments: { prompt: string } }) {
  const { prompt } = props.arguments;
  const prefs = getPreferenceValues();
  const model_override = prefs.openrouter_model_transform_preview;
  const reasoning_effort = prefs.reasoning_effort_transform_preview;
  const toast_title = "Transforming...";

  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      reasoning_effort={reasoning_effort}
      toast_title={toast_title}
    />
  );
}
