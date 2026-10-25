import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { unwrapText, withTextTagNote, wrapText } from "./prompts";
import {
  ChatRequest,
  createChat,
  openRouterParams,
  resolveModel,
  resolveReasoningEffort,
  resolveServiceTier,
} from "./api";

interface RunNoUICommandProps {
  action: string;
  prompt?: string;
  model_override?: string;
  reasoning_effort?: string;
  service_tier?: string;
  // Send the selection as data in <text-to-process> tags (only together with a prompt)
  wrapInput?: boolean;
  successMessage: string;
}

export async function runNoUICommand({
  action,
  prompt,
  model_override,
  reasoning_effort,
  service_tier,
  wrapInput = false,
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

    const wrap = wrapInput && !!prompt;
    const messages = prompt
      ? [
          { role: "system" as const, content: wrap ? withTextTagNote(prompt) : prompt },
          { role: "user" as const, content: wrap ? wrapText(selectedText) : selectedText },
        ]
      : [{ role: "user" as const, content: selectedText }];

    const request: ChatRequest = {
      model,
      messages,
      ...openRouterParams(resolveReasoningEffort(reasoning_effort), resolveServiceTier(service_tier)),
    };
    const response = await createChat(request);

    const content = response.choices[0]?.message?.content;
    const text = (wrap && content ? unwrapText(content) : content)?.trim();

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
