import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

type Preferences = {
  openrouterApiKey?: string;
  openrouterModel?: string;
  openrouterSmartModel?: string;
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

// OpenRouter exposes an OpenAI-compatible API, so the openai SDK is used as the client
export function getClient() {
  return new OpenAI({
    apiKey: requirePreference(getPreferences().openrouterApiKey, "OpenRouter API Key"),
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
  });
}

export function getGlobalModel() {
  return requirePreference(getPreferences().openrouterModel, "Model ID");
}

// Model for "Retry with Smartest Model"; undefined when not configured
export function getSmartModel() {
  return getPreferences().openrouterSmartModel?.trim() || undefined;
}

// Command-level override wins over the global model
export function resolveModel(modelOverride?: string) {
  return modelOverride?.trim() || getGlobalModel();
}
