/**
 * Centralized LLM / Ollama config
 * All AI-related endpoints and model names come from here.
 * Change values in .env.local to override.
 */

export const LLM = {
  /** vLLM base URL (OpenAI-compatible) */
  baseUrl: process.env.VLLM_BASE_URL || 'http://127.0.0.1:8001/v1',

  /** Model name/path */
  model: process.env.VLLM_MODEL || 'Qwen3.5-9B-UD-Q5_K_XL.gguf',

  /** Full /v1/chat/completions endpoint */
  get chatUrl() { return `${this.baseUrl}/chat/completions`; },
} as const;

/**
 * Simple helper to call vLLM with a system + user prompt.
 * Returns the assistant text content.
 */
export async function ollamaChat(
  system: string,
  userPrompt: string,
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string> {
  const { maxTokens = 1024, temperature = 0.1, timeoutMs = 60000 } = opts;

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userPrompt });

  const noThink = process.env.LLM_NO_THINK !== 'false';
  const res = await fetch(LLM.chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM.model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
      chat_template_kwargs: { enable_thinking: !noThink },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`vLLM error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '')
    .replace(/<think>[\s\S]*?<\/think>\s*/gi, '')
    .replace(/<think>[\s\S]*/gi, '')
    .trim();
}
