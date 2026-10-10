import { getPreferenceValues, LaunchProps } from "@raycast/api";
import ResultView from "./common";

export default function TransformPreview(props: LaunchProps<{ arguments: Arguments.TransformPreview }>) {
  const prefs = getPreferenceValues<Preferences.TransformPreview>();
  return (
    <ResultView
      sys_prompt={props.arguments.prompt}
      model_override={prefs.openrouter_model_transform_preview}
      reasoning_effort={prefs.reasoning_effort_transform_preview}
      toast_title="Transforming..."
    />
  );
}
