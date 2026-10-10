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
import { getClient, getProviderLabel, ResolvedRequestConfig, resolveRequestConfig } from "./api";
import { countToken, estimatePrice, formatPriceUSD, sentToSideNote } from "./util";

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
  const pref = getPreferenceValues<{
    sidenote?: boolean;
    openrouterInputPrice?: string;
    openrouterOutputPrice?: string;
  }>();
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);
  const [provider, setProvider] = useState(() => {
    try {
      return resolveRequestConfig(model_override, openrouter_model_override).provider;
    } catch {
      return "openai" as const;
    }
  });
  const [model, setModel] = useState(() => {
    try {
      return resolveRequestConfig(model_override, openrouter_model_override).model;
    } catch {
      return "";
    }
  });
  const providerLabel = getProviderLabel(provider);
  const generation = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  // Starts a new request generation and cancels the in-flight one, if any
  function nextGeneration() {
    abortController.current?.abort();
    abortController.current = new AbortController();
    return ++generation.current;
  }

  async function getResult(gen: number, forcedConfig?: ResolvedRequestConfig) {
    const now = new Date();
    const toast = await showToast(Toast.Style.Animated, toast_title);
    let selectedText = "";
    if (selected_text !== undefined) {
      selectedText = selected_text;
    } else {
      try {
        selectedText = await getSelectedText();
      } catch {
        if (gen !== generation.current) return;
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
        setLoading(false);
        setResponse(
          "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again.",
        );
        return;
      }
    }

    if (gen !== generation.current) return;

    let requestProvider = provider;
    try {
      const requestConfig = forcedConfig ?? resolveRequestConfig(model_override, openrouter_model_override);
      requestProvider = requestConfig.provider;
      setProvider(requestConfig.provider);
      setModel(requestConfig.model);
      const user_content = user_extra_msg ? `${user_extra_msg}\n\n${selectedText}` : selectedText;
      const stream = await getClient(requestConfig.provider).chat.completions.create(
        {
          model: requestConfig.model,
          messages: [
            { role: "system", content: sys_prompt },
            { role: "user", content: user_content },
          ],
          stream: true,
        },
        { signal: abortController.current?.signal },
      );
      if (gen !== generation.current) return;
      setPromptTokenCount(countToken(sys_prompt + user_content));

      let response_ = "";
      let finishReason: string | null = null;
      for await (const part of stream) {
        if (gen !== generation.current) return;
        // Some providers send chunks without choices (e.g. usage or keep-alive chunks)
        const choice = part.choices[0];
        const message = choice?.delta?.content;
        if (message) {
          response_ += message;
          setResponse(response_);
          setResponseTokenCount(countToken(response_));
        }
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
          break; // Stream finished
        }
      }
      if (gen !== generation.current) return;

      // The stream may also end without a finish_reason, so finalize after the loop
      setLoading(false);
      const duration = (new Date().getTime() - now.getTime()) / 1000;
      if (finishReason && finishReason !== "stop") {
        toast.style = Toast.Style.Failure;
        toast.title = `Stopped early (${finishReason}) after ${duration} seconds`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `Finished in ${duration} seconds`;
      }
    } catch (error) {
      if (gen !== generation.current) return;
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        `⚠️ Failed to get response from ${getProviderLabel(requestProvider)}. Please check your network connection and API settings. \n\n Error Message: \`\`\`${
          (error as Error).message
        }\`\`\``,
      );
      return;
    }
  }

  async function retry() {
    const gen = nextGeneration();
    try {
      const requestConfig = resolveRequestConfig(model_override, openrouter_model_override);
      setProvider(requestConfig.provider);
      setModel(requestConfig.model);
    } catch {
      setProvider("openai");
      setModel("");
    }
    setLoading(true);
    setResponse("");
    getResult(gen);
  }

  async function retryWithGPT5_4() {
    const gen = nextGeneration();
    const requestConfig: ResolvedRequestConfig = { provider: "openai", model: "gpt-5.4" };
    setProvider(requestConfig.provider);
    setModel(requestConfig.model);
    setLoading(true);
    setResponse("");
    getResult(gen, requestConfig);
  }

  useEffect(() => {
    const gen = nextGeneration();
    getResult(gen);
    return () => {
      generation.current++; // invalidate this generation on cleanup
      abortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (loading == false) {
      setCumulativeTokens((tokens) => tokens + prompt_token_count + response_token_count);
      const estimatedCost = estimatePrice(prompt_token_count, response_token_count, model, {
        provider,
        openrouterInputPrice: pref.openrouterInputPrice,
        openrouterOutputPrice: pref.openrouterOutputPrice,
      });
      if (estimatedCost >= 0) {
        setCumulativeCost((cost) => cost + estimatedCost);
      }
    }
  }, [
    loading,
    model,
    pref.openrouterInputPrice,
    pref.openrouterOutputPrice,
    prompt_token_count,
    provider,
    response_token_count,
  ]);

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

  const estimatedCost = estimatePrice(prompt_token_count, response_token_count, model, {
    provider,
    openrouterInputPrice: pref.openrouterInputPrice,
    openrouterOutputPrice: pref.openrouterOutputPrice,
  });

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
            text={estimatedCost >= 0 ? formatPriceUSD(estimatedCost) : "Unavailable"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Cumulative Tokens" text={cumulative_tokens.toString()} />
          <Detail.Metadata.Label
            title="Cumulative Cost"
            text={cumulative_cost >= 0 ? formatPriceUSD(cumulative_cost) : "Unavailable"}
          />
        </Detail.Metadata>
      }
    />
  );
}
