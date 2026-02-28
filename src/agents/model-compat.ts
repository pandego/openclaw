import type { Api, Model } from "@mariozechner/pi-ai";

function isOpenAiCompletionsModel(model: Model<Api>): model is Model<"openai-completions"> {
  return model.api === "openai-completions";
}

function isDashScopeCompatibleEndpoint(baseUrl: string): boolean {
  return (
    baseUrl.includes("dashscope.aliyuncs.com") ||
    baseUrl.includes("dashscope-intl.aliyuncs.com") ||
    baseUrl.includes("dashscope-us.aliyuncs.com")
  );
}

function isAnthropicMessagesModel(model: Model<Api>): model is Model<"anthropic-messages"> {
  return model.api === "anthropic-messages";
}

/**
 * pi-ai constructs the Anthropic API endpoint as `${baseUrl}/v1/messages`.
 * If a user configures `baseUrl` with a trailing `/v1` (e.g. the previously
 * recommended format "https://api.anthropic.com/v1"), the resulting URL
 * becomes "…/v1/v1/messages" which the Anthropic API rejects with a 404.
 *
 * Strip a single trailing `/v1` (with optional trailing slash) from the
 * baseUrl for anthropic-messages models so users with either format work.
 */
function normalizeAnthropicBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/v1\/?$/, "");
}

/**
 * pi-ai constructs OpenAI-compatible chat-completions requests as
 * `${baseUrl}/chat/completions`.
 *
 * If users configure `baseUrl` as a full endpoint (e.g. `.../v1/chat/completions`),
 * requests become `.../v1/chat/completions/chat/completions` and fail with 404.
 *
 * Strip one trailing `/chat/completions` segment so both base styles work.
 */
function normalizeOpenAiCompletionsBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/chat\/completions\/?$/i, "");
}

export function normalizeModelCompat(model: Model<Api>): Model<Api> {
  const baseUrl = model.baseUrl ?? "";

  // Normalise anthropic-messages baseUrl: strip trailing /v1 that users may
  // have included in their config. pi-ai appends /v1/messages itself.
  if (isAnthropicMessagesModel(model) && baseUrl) {
    const normalised = normalizeAnthropicBaseUrl(baseUrl);
    if (normalised !== baseUrl) {
      return { ...model, baseUrl: normalised } as Model<"anthropic-messages">;
    }
  }

  if (isOpenAiCompletionsModel(model) && baseUrl) {
    const normalized = normalizeOpenAiCompletionsBaseUrl(baseUrl);
    if (normalized !== baseUrl) {
      return { ...model, baseUrl: normalized } as Model<"openai-completions">;
    }
  }

  const isZai = model.provider === "zai" || baseUrl.includes("api.z.ai");
  const isMoonshot =
    model.provider === "moonshot" ||
    baseUrl.includes("moonshot.ai") ||
    baseUrl.includes("moonshot.cn");
  const isDashScope = model.provider === "dashscope" || isDashScopeCompatibleEndpoint(baseUrl);
  if ((!isZai && !isMoonshot && !isDashScope) || !isOpenAiCompletionsModel(model)) {
    return model;
  }

  const openaiModel = model;
  const compat = openaiModel.compat ?? undefined;
  if (compat?.supportsDeveloperRole === false) {
    return model;
  }

  openaiModel.compat = compat
    ? { ...compat, supportsDeveloperRole: false }
    : { supportsDeveloperRole: false };
  return openaiModel;
}
