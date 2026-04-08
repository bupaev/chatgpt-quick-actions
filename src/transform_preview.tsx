import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Command(props: { arguments: { prompt: string } }) {
  const { prompt } = props.arguments;
  const prefs = getPreferenceValues();
  const model_override = prefs.model_transform_preview;
  const openrouter_model_override = prefs.openrouter_model_transform_preview;
  const toast_title = "Transforming...";

  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      openrouter_model_override={openrouter_model_override}
      toast_title={toast_title}
    />
  );
}
