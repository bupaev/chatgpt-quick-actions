import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { ChatRequest, getClient, reasoningParams, resolveModel, resolveReasoningEffort } from "./api";

interface RunNoUICommandProps {
  action: string;
  prompt?: string;
  model_override?: string;
  reasoning_effort?: string;
  successMessage: string;
}

export async function runNoUICommand({
  action,
  prompt,
  model_override,
  reasoning_effort,
  successMessage,
}: RunNoUICommandProps) {
  let selectedText = "";

  try {
    selectedText = await getSelectedText();
  } catch (error) {
    await showHUD(`No text selected (${error})`);
    return;
  }

  try {
    // Inside try: a missing API key or model should end in a HUD, not an unhandled error
    const model = resolveModel(model_override);

    await showHUD(`${action} with ${model}...`);

    const messages = prompt
      ? [
          { role: "system" as const, content: prompt },
          { role: "user" as const, content: selectedText },
        ]
      : [{ role: "user" as const, content: selectedText }];

    const request: ChatRequest = { model, messages, ...reasoningParams(resolveReasoningEffort(reasoning_effort)) };
    const response = await getClient().chat.completions.create(request);

    const text = response.choices[0]?.message?.content?.trim();

    if (!text) {
      await showHUD(`No response from ${model}.`);
      return;
    }

    await Clipboard.paste(text);
    await showHUD(successMessage);
  } catch (error) {
    await showHUD(`Error from OpenRouter: ${(error as Error).message}`);
  }
}
