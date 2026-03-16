import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { global_model, openai } from "./api";

export default async function Command(props: { arguments: { prompt: string } }) {
  const { prompt } = props.arguments;
  const selectedText = await getSelectedText();
  const model_override = getPreferenceValues().model_transform;
  const model = model_override == "global" ? global_model : model_override;

  await showHUD(`Transforming with model ${model}...`);
  try {
    const res = await openai.chat.completions.create({
      model: model,
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
      await showHUD("No response from OpenAI.");
    }
  } catch (error) {
    await showHUD(`Error: ${(error as Error).message}`);
  }
}
