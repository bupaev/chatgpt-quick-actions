import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

export type ApiProvider = "openai" | "openrouter";

interface ResolvedRequestConfig {
  model: string;
  provider: ApiProvider;
}

type Preferences = {
  apikey?: string;
  apiProvider?: ApiProvider;
  model?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_REFERER = "https://github.com/bupaev/chatgpt-quick-actions";
const OPENROUTER_TITLE = "ChatGPT Quick Actions";

function getPreferences() {
  return getPreferenceValues<Preferences>();
}

function requirePreference(value: string | undefined, title: string) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw new Error(`Set ${title} in the extension preferences.`);
  }
  return trimmedValue;
}

export function getProvider(): ApiProvider {
  return getPreferences().apiProvider ?? "openai";
}

export function getProviderLabel(provider = getProvider()) {
  return provider === "openrouter" ? "OpenRouter" : "OpenAI";
}

export function getClient(provider = getProvider()) {
  const prefs = getPreferences();

  if (provider === "openrouter") {
    return new OpenAI({
      apiKey: requirePreference(prefs.openrouterApiKey, "OpenRouter API Key"),
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": OPENROUTER_TITLE,
      },
    });
  }

  return new OpenAI({
    apiKey: requirePreference(prefs.apikey, "OpenAI API Key"),
  });
}

export function getGlobalModel(provider = getProvider()) {
  const prefs = getPreferences();

  if (provider === "openrouter") {
    return requirePreference(prefs.openrouterModel, "OpenRouter Model ID");
  }

  return requirePreference(prefs.model, "OpenAI Model");
}

export function resolveRequestConfig(openaiOverride: string, openrouterOverride?: string): ResolvedRequestConfig {
  const openrouterModel = openrouterOverride?.trim();
  if (openrouterModel) {
    return {
      model: openrouterModel,
      provider: "openrouter",
    };
  }

  if (openaiOverride !== "global") {
    return {
      model: openaiOverride,
      provider: "openai",
    };
  }

  const provider = getProvider();
  return {
    model: getGlobalModel(provider),
    provider,
  };
}

export function resolveModel(openaiOverride: string, openrouterOverride?: string) {
  return resolveRequestConfig(openaiOverride, openrouterOverride).model;
}
