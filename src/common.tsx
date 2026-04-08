import {
  getSelectedText,
  Detail,
  getPreferenceValues,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getClient, getProvider, getProviderLabel, resolveModel } from "./api";
import { countToken, estimatePrice, sentToSideNote } from "./util";

interface ResultViewProps {
  sys_prompt: string;
  model_override: string;
  openrouter_model_override?: string;
  toast_title: string;
  user_extra_msg?: string;
  selected_text?: string;
}

export default function ResultView({
  sys_prompt,
  model_override,
  openrouter_model_override,
  toast_title,
  user_extra_msg,
  selected_text,
}: ResultViewProps) {
  const pref = getPreferenceValues();
  const provider = getProvider();
  const providerLabel = getProviderLabel(provider);
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);
  const [model, setModel] = useState(() => {
    try {
      return resolveModel(model_override, openrouter_model_override);
    } catch {
      return "";
    }
  });
  const generation = useRef(0);

  async function getResult(gen: number) {
    const now = new Date();
    let duration = 0;
    const toast = await showToast(Toast.Style.Animated, toast_title);
    let selectedText = "";
    if (selected_text !== undefined) {
      selectedText = selected_text;
    } else {
      try {
        selectedText = await getSelectedText();
      } catch (error) {
        if (gen !== generation.current) return;
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
        setLoading(false);
        setResponse(
          "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again."
        );
        return;
      }
    }

    if (gen !== generation.current) return;

    try {
      const resolvedModel = resolveModel(model_override, openrouter_model_override);
      setModel(resolvedModel);
      const user_content = user_extra_msg ? `${user_extra_msg}\n\n${selectedText}` : selectedText;
      const stream = await getClient(provider).chat.completions.create({
        model: resolvedModel,
        messages: [
          { role: "system", content: sys_prompt },
          { role: "user", content: user_content },
        ],
        stream: true,
      });
      if (gen !== generation.current) return;
      setPromptTokenCount(countToken(sys_prompt + user_content));

      if (!stream) return;

      let response_ = "";
      for await (const part of stream) {
        if (gen !== generation.current) return;
        const message = part.choices[0].delta.content;
        if (message) {
          response_ += message;
          setResponse(response_);
          setResponseTokenCount(countToken(response_));
        }
        if (part.choices[0].finish_reason === "stop") {
          setLoading(false);
          const done = new Date();
          duration = (done.getTime() - now.getTime()) / 1000;
          toast.style = Toast.Style.Success;
          toast.title = `Finished in ${duration} seconds`;
          break; // Stream finished
        }
      }
    } catch (error) {
      if (gen !== generation.current) return;
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        `⚠️ Failed to get response from ${providerLabel}. Please check your network connection and API settings. \n\n Error Message: \`\`\`${
          (error as Error).message
        }\`\`\``
      );
      return;
    }
  }

  async function retry() {
    const gen = ++generation.current;
    try {
      setModel(resolveModel(model_override, openrouter_model_override));
    } catch {
      setModel("");
    }
    setLoading(true);
    setResponse("");
    getResult(gen);
  }

  async function retryWithGPT5_4() {
    const gen = ++generation.current;
    setModel("gpt-5.4");
    setLoading(true);
    setResponse("");
    getResult(gen);
  }

  useEffect(() => {
    const gen = ++generation.current;
    getResult(gen);
    return () => {
      generation.current++; // invalidate this generation on cleanup
    };
  }, []);

  useEffect(() => {
    if (loading == false) {
      setCumulativeTokens((tokens) => tokens + prompt_token_count + response_token_count);
      const estimatedCost = estimatePrice(prompt_token_count, response_token_count, model);
      if (estimatedCost >= 0) {
        setCumulativeCost((cost) => cost + estimatedCost);
      }
    }
  }, [loading, model, prompt_token_count, response_token_count]);

  let sidenote = undefined;
  if (pref.sidenote) {
    sidenote = (
      <Action
        title="Send to SideNote"
        onAction={async () => {
          await sentToSideNote(response);
        }}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        icon={Icon.Sidebar}
      />
    );
  }

  const estimatedCost = estimatePrice(prompt_token_count, response_token_count, model);

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.Paste title="Replace Selected" content={response} icon={Icon.Pencil} />
            <Action.CopyToClipboard
              title="Copy Results"
              content={response}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action title="Retry" onAction={retry} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
            {provider === "openai" && model != "gpt-5.4" && (
              <Action
                title="Retry with GPT-5.4"
                onAction={retryWithGPT5_4}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                icon={Icon.ArrowNe}
              />
            )}
            {sidenote}
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Provider" text={providerLabel} />
          <Detail.Metadata.Label title="Current Model" text={model} />
          <Detail.Metadata.Label title="Prompt Tokens" text={prompt_token_count.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={response_token_count.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={(prompt_token_count + response_token_count).toString()} />
          <Detail.Metadata.Label
            title="Total Cost"
            text={estimatedCost >= 0 ? estimatedCost + " cents" : "Unavailable"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Culmulative Tokens" text={cumulative_tokens.toString()} />
          <Detail.Metadata.Label title="Culmulative Cost" text={cumulative_cost.toString() + " cents"} />
        </Detail.Metadata>
      }
    />
  );
}
