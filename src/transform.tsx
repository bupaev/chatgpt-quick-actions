import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { getClient, getProviderLabel, resolveRequestConfig } from "./api";

export default async function Command(props: { arguments: { prompt: string } }) {
  const { prompt } = props.arguments;

  let selectedText = "";
  try {
    selectedText = await getSelectedText();
  } catch {
    // getSelectedText failed — fall back to clipboard
  }
  if (!selectedText) {
    try {
      selectedText = (await Clipboard.readText()) ?? "";
    } catch {
      // clipboard also failed
    }
  }
  if (!selectedText) {
    await showHUD("No text selected and clipboard is empty.");
    return;
  }

  const prefs = getPreferenceValues();
  const model_override = prefs.model_transform;
  const openrouter_model_override = prefs.openrouter_model_transform;
  const requestConfig = resolveRequestConfig(model_override, openrouter_model_override);
  const providerLabel = getProviderLabel(requestConfig.provider);

  await showHUD(`Transforming with ${providerLabel} model ${requestConfig.model}...`);
  try {
    const res = await getClient(requestConfig.provider).chat.completions.create({
      model: requestConfig.model,
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
