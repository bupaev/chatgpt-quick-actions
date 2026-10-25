import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  getSelectedText,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  ChatStreamRequest,
  getSmartModel,
  parseProvider,
  parseUsage,
  createChatStream,
  openRouterParams,
  parseServiceTier,
  resolveServiceTier,
  RequestUsage,
  resolveModel,
  resolveReasoningEffort,
} from "./api";
import { formatCostUSD, formatTokens } from "./util";
import { unwrapText, withTextTagNote, wrapText } from "./prompts";

interface ResultViewProps {
  sys_prompt: string;
  model_override?: string;
  reasoning_effort?: string;
  service_tier?: string;
  toast_title: string;
  // Send the selection as data in <text-to-process> tags; off when the selection itself is the request
  wrap_input?: boolean;
}

export default function ResultView({
  sys_prompt,
  model_override,
  reasoning_effort,
  service_tier,
  toast_title,
  wrap_input = false,
}: ResultViewProps) {
  // Reported by OpenRouter at the end of the stream; undefined while loading or on error
  const [usage, setUsage] = useState<RequestUsage>();
  // Seconds from the command start to the end of the answer; undefined while loading or on error
  const [responseTime, setResponseTime] = useState<number>();
  // Provider OpenRouter routed the request to, e.g. "Google"
  const [servedBy, setServedBy] = useState<string>();
  // Service tier that actually served the request, e.g. "priority" or "default"
  const [servedTier, setServedTier] = useState<string>();
  // True when the selection could not be read and the clipboard was used instead
  const [usedClipboard, setUsedClipboard] = useState(false);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(() => {
    try {
      return resolveModel(model_override);
    } catch {
      return "";
    }
  });
  const smartModel = getSmartModel();
  // Also applies to "Retry with Smartest Model"
  const effort = resolveReasoningEffort(reasoning_effort);
  const tier = resolveServiceTier(service_tier);
  const generation = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  // Starts a new request generation and cancels the in-flight one, if any
  function nextGeneration() {
    abortController.current?.abort();
    abortController.current = new AbortController();
    return ++generation.current;
  }

  async function getResult(gen: number, forcedModel?: string) {
    const now = new Date();
    const toast = await showToast(Toast.Style.Animated, toast_title);
    let selectedText = "";
    let fromClipboard = false;
    try {
      selectedText = await getSelectedText();
    } catch {
      // Falls back to the clipboard below
    }
    if (!selectedText) {
      // Raycast could not read the selection (e.g. its window took focus first or the app does not
      // expose it): use the clipboard instead and flag it, since it may hold older text
      selectedText = (await Clipboard.readText().catch(() => undefined)) ?? "";
      fromClipboard = selectedText !== "";
    }
    if (!selectedText) {
      if (gen !== generation.current) return;
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        "⚠️ Raycast was unable to get the selected text, and the clipboard is empty. Select or copy some text and try again.",
      );
      return;
    }

    if (gen !== generation.current) return;
    setUsedClipboard(fromClipboard);

    try {
      const requestModel = forcedModel ?? resolveModel(model_override);
      setModel(requestModel);
      const system_content = wrap_input ? withTextTagNote(sys_prompt) : sys_prompt;
      const user_content = wrap_input ? wrapText(selectedText) : selectedText;
      const request: ChatStreamRequest = {
        model: requestModel,
        messages: [
          { role: "system", content: system_content },
          { role: "user", content: user_content },
        ],
        stream: true,
        ...openRouterParams(effort, tier),
      };
      const stream = await createChatStream(request, abortController.current?.signal);
      if (gen !== generation.current) return;

      let response_ = "";
      let finishReason: string | null = null;
      let usage_: RequestUsage | undefined;
      // Read to the end: usage arrives in the last chunk, after the one with finish_reason
      for await (const part of stream) {
        if (gen !== generation.current) return;
        // Some chunks carry no choices (e.g. the usage chunk or keep-alives)
        const choice = part.choices[0];
        const message = choice?.delta?.content;
        if (message) {
          response_ += message;
          setResponse(wrap_input ? unwrapText(response_) : response_);
        }
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
        usage_ = parseUsage(part.usage) ?? usage_;
        const provider = parseProvider(part);
        if (provider) {
          setServedBy(provider);
        }
        const partTier = parseServiceTier(part);
        if (partTier) {
          setServedTier(partTier);
        }
      }
      if (gen !== generation.current) return;

      // The stream may also end without a finish_reason, so finalize after the loop
      setLoading(false);
      setUsage(usage_);
      const duration = (new Date().getTime() - now.getTime()) / 1000;
      setResponseTime(duration);
      if (finishReason && finishReason !== "stop") {
        toast.style = Toast.Style.Failure;
        toast.title = `Stopped early (${finishReason}) after ${duration} seconds`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = fromClipboard
          ? `Finished in ${duration} seconds (input from clipboard)`
          : `Finished in ${duration} seconds`;
      }
    } catch (error) {
      if (gen !== generation.current) return;
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        `⚠️ Failed to get response from OpenRouter. Please check your network connection and API settings. \n\n Error Message: \`\`\`${
          (error as Error).message
        }\`\`\``,
      );
      return;
    }
  }

  async function retry() {
    const gen = nextGeneration();
    try {
      setModel(resolveModel(model_override));
    } catch {
      setModel("");
    }
    setLoading(true);
    setResponse("");
    setUsage(undefined);
    setResponseTime(undefined);
    setServedBy(undefined);
    setServedTier(undefined);
    getResult(gen);
  }

  async function retryWithSmartestModel() {
    if (!smartModel) return;
    const gen = nextGeneration();
    setModel(smartModel);
    setLoading(true);
    setResponse("");
    setUsage(undefined);
    setResponseTime(undefined);
    setServedBy(undefined);
    setServedTier(undefined);
    getResult(gen, smartModel);
  }

  useEffect(() => {
    const gen = nextGeneration();
    getResult(gen);
    return () => {
      generation.current++; // invalidate this generation on cleanup
      abortController.current?.abort();
    };
  }, []);

  // Placeholder for values OpenRouter has not reported (yet)
  const missing = loading ? "…" : "Unavailable";

  // Shown when a tier was requested or the request was served by a non-standard tier;
  // flags a fallback, e.g. "default (requested priority)"
  let tierLabel: string | undefined;
  if (tier || (servedTier && servedTier !== "default")) {
    const shown = servedTier ?? (tier && loading ? tier : missing);
    tierLabel = tier && servedTier && servedTier !== tier ? `${shown} (requested ${tier})` : shown;
  }

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.Paste title="Replace Selected" content={response} icon={Icon.Pencil} />
            {/* Second action: Raycast binds it to ⌘↵ automatically */}
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action title="Retry" onAction={retry} shortcut={Keyboard.Shortcut.Common.Refresh} icon={Icon.Repeat} />
            {smartModel && model !== smartModel && (
              <Action
                title="Retry with Smartest Model"
                onAction={retryWithSmartestModel}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                icon={Icon.ArrowNe}
              />
            )}
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          {usedClipboard && (
            <Detail.Metadata.Label
              title="Input"
              text={{ value: "Clipboard (no selection found)", color: Color.Orange }}
              icon={{ source: Icon.Clipboard, tintColor: Color.Orange }}
            />
          )}
          <Detail.Metadata.Label title="Current Model" text={model} />
          {servedBy && <Detail.Metadata.Label title="Provider" text={servedBy} />}
          {effort && <Detail.Metadata.Label title="Reasoning Effort" text={effort} />}
          {tierLabel && <Detail.Metadata.Label title="Service Tier" text={tierLabel} />}
          <Detail.Metadata.Label
            title="Response Time"
            text={responseTime !== undefined ? `${responseTime.toFixed(1)} s` : missing}
          />
          <Detail.Metadata.Label title="Tokens" text={usage ? formatTokens(usage) : missing} />
          <Detail.Metadata.Label title="Cost" text={usage?.cost !== undefined ? formatCostUSD(usage.cost) : missing} />
        </Detail.Metadata>
      }
    />
  );
}
