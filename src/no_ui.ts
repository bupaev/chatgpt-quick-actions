import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { getClient, getProviderLabel, resolveModel } from "./api";

interface RunNoUICommandProps {
  action: string;
  prompt?: string;
  model_override: string;
  openrouter_model_override?: string;
  successMessage: string;
}

export async function runNoUICommand({
  action,
  prompt,
  model_override,
  openrouter_model_override,
  successMessage,
}: RunNoUICommandProps) {
  let selectedText = "";

  try {
    selectedText = await getSelectedText();
  } catch (error) {
    await showHUD(`No text selected (${error})`);
    return;
  }

  const providerLabel = getProviderLabel();
  const model = resolveModel(model_override, openrouter_model_override);

  await showHUD(`${action} with ${providerLabel} model ${model}...`);

  try {
    const messages = prompt
      ? [
          { role: "system" as const, content: prompt },
          { role: "user" as const, content: selectedText },
        ]
      : [{ role: "user" as const, content: selectedText }];

    const response = await getClient().chat.completions.create({
      model,
      messages,
    });

    const text = response.choices[0]?.message?.content?.trim();

    if (!text) {
      await showHUD(`No response from ${providerLabel}.`);
      return;
    }

    await Clipboard.paste(text);
    await showHUD(successMessage);
  } catch (error) {
    await showHUD(`Error from ${providerLabel}: ${(error as Error).message}`);
  }
}
