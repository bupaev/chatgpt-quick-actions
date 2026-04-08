import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { getClient, getProviderLabel, resolveModel } from "./api";

const prefs = getPreferenceValues();
const model_override = prefs.model_execute;
const openrouter_model_override = prefs.openrouter_model_execute;

export default async function Command() {
  const selectedText = await getSelectedText();
  const providerLabel = getProviderLabel();
  const model = resolveModel(model_override, openrouter_model_override);
  await showHUD(`Connecting to ${providerLabel} with model ${model}...`);
  const res = await getClient().chat.completions.create({
    model,
    messages: [{ role: "user", content: selectedText }],
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (text) {
    showHUD("Response pasted to the current application.");
    await Clipboard.paste(text);
  } else {
    await showHUD(`No response from ${providerLabel}.`);
  }
}
