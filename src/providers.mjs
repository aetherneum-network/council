// Provider registry. A "seat" is active only when its API key is present in the
// environment — so the Council is whoever you have keys for. No key, no seat.
//
// Two wire formats are supported:
//   - "anthropic"  → POST {base}/v1/messages           (x-api-key header)
//   - "openai"     → POST {base}/chat/completions       (Bearer header, OpenAI-compatible)
//
// Every major fast-inference host (Groq, Cerebras, Moonshot, Together, OpenRouter,
// Mistral, DeepSeek, xAI, local Ollama/LM Studio) speaks the OpenAI format, so adding
// a seat is usually one registry entry.

export const REGISTRY = [
  {
    id: "anthropic",
    seat: "Anthropic Claude",
    type: "anthropic",
    base: "https://api.anthropic.com",
    envKey: "ANTHROPIC_API_KEY",
    envModel: "COUNCIL_ANTHROPIC_MODEL",
    model: "claude-sonnet-4-20250514",
  },
  {
    id: "groq",
    seat: "Groq Llama",
    type: "openai",
    base: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    envModel: "COUNCIL_GROQ_MODEL",
    model: "llama-3.3-70b-versatile",
  },
  {
    id: "cerebras",
    seat: "Cerebras GPT-OSS",
    type: "openai",
    base: "https://api.cerebras.ai/v1",
    envKey: "CEREBRAS_API_KEY",
    envModel: "COUNCIL_CEREBRAS_MODEL",
    model: "gpt-oss-120b",
  },
  {
    id: "moonshot",
    seat: "Moonshot Kimi",
    type: "openai",
    base: "https://api.moonshot.ai/v1",
    envKey: "MOONSHOT_API_KEY",
    envModel: "COUNCIL_MOONSHOT_MODEL",
    model: "moonshot-v1-32k",
  },
  {
    id: "openai",
    seat: "OpenAI GPT",
    type: "openai",
    base: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    envModel: "COUNCIL_OPENAI_MODEL",
    model: "gpt-4o",
  },
  {
    id: "deepseek",
    seat: "DeepSeek",
    type: "openai",
    base: "https://api.deepseek.com/v1",
    envKey: "DEEPSEEK_API_KEY",
    envModel: "COUNCIL_DEEPSEEK_MODEL",
    model: "deepseek-chat",
  },
  {
    id: "mistral",
    seat: "Mistral",
    type: "openai",
    base: "https://api.mistral.ai/v1",
    envKey: "MISTRAL_API_KEY",
    envModel: "COUNCIL_MISTRAL_MODEL",
    model: "mistral-large-latest",
  },
  {
    id: "xai",
    seat: "xAI Grok",
    type: "openai",
    base: "https://api.x.ai/v1",
    envKey: "XAI_API_KEY",
    envModel: "COUNCIL_XAI_MODEL",
    model: "grok-2-latest",
  },
  {
    id: "openrouter",
    seat: "OpenRouter",
    type: "openai",
    base: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    envModel: "COUNCIL_OPENROUTER_MODEL",
    model: "meta-llama/llama-3.3-70b-instruct",
  },
];

// Active seats = registry entries whose key is set. Optional COUNCIL_SEATS env
// (comma list of ids) narrows the panel.
export function activeSeats(env = process.env) {
  const only = (env.COUNCIL_SEATS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return REGISTRY.filter((p) => {
    if (!env[p.envKey]) return false;
    if (only.length && !only.includes(p.id)) return false;
    return true;
  }).map((p) => ({ ...p, model: env[p.envModel] || p.model, apiKey: env[p.envKey] }));
}

async function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function callAnthropic(seat, system, user, opts) {
  const r = await withTimeout(
    fetch(`${seat.base}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": seat.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: seat.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        system,
        messages: [{ role: "user", content: user }],
      }),
    }),
    opts.timeout,
    seat.seat
  );
  if (!r.ok) throw new Error(`${seat.seat} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return (j.content || []).map((b) => b.text || "").join("").trim();
}

async function callOpenAI(seat, system, user, opts) {
  const r = await withTimeout(
    fetch(`${seat.base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${seat.apiKey}`,
      },
      body: JSON.stringify({
        model: seat.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    }),
    opts.timeout,
    seat.seat
  );
  if (!r.ok) throw new Error(`${seat.seat} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || "").trim();
}

export async function askSeat(seat, system, user, opts) {
  if (seat.type === "anthropic") return callAnthropic(seat, system, user, opts);
  return callOpenAI(seat, system, user, opts);
}
