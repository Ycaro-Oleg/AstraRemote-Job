import type { LlmClient } from "@astra/core";

const PROVIDER_DEFAULTS: Record<string, { base: string; model: string }> = {
  deepseek: { base: "https://api.deepseek.com", model: "deepseek-chat" },
  openrouter: { base: "https://openrouter.ai/api/v1", model: "deepseek/deepseek-chat:free" },
  xai: { base: "https://api.x.ai/v1", model: "grok-4.5" },
};

export function createLlmClient(): LlmClient | null {
  const key = process.env.LLM_API_KEY?.trim();
  if (!key) return null;
  const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
  const preset = PROVIDER_DEFAULTS[provider];
  const base = (process.env.LLM_BASE_URL ?? preset?.base ?? "").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? preset?.model ?? "";
  if (!base || !model) return null;

  return {
    async complete({ system, user, jsonSchema }) {
      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
      };
      if (jsonSchema) {
        body.response_format = { type: "json_object" };
      }
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned empty content");
      return content;
    },
  };
}
