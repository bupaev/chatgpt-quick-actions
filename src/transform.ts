import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { getClient, getProviderLabel, resolveModel } from "./api";

export default async function Command(props: { arguments: { prompt: string } }) {
  const { prompt } = props.arguments;
  const selectedText = await getSelectedText();
  const prefs = getPreferenceValues();
  const model_override = prefs.model_transform;
  const openrouter_model_override = prefs.openrouter_model_transform;
  const model = resolveModel(model_override, openrouter_model_override);
  const providerLabel = getProviderLabel();

  await showHUD(`Transforming with ${providerLabel} model ${model}...`);
  try {
    const res = await getClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: selectedText },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim();
    if (text) {
      await Clipboard.paste(text);
      await showHUD("Transformed text pasted.");
    } else {
      await showHUD(`No response from ${providerLabel}.`);
    }
  } catch (error) {
    await showHUD(`Error: ${(error as Error).message}`);
  }
}
