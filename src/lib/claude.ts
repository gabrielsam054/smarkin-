/**
 * claude.ts — Direct Anthropic API helper for server-side use.
 * Call this from Server Actions and API routes directly.
 * Never import from client components.
 */

export interface ClaudeMessage { role: "user" | "assistant"; content: string }

export async function callClaude(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? "claude-sonnet-4-6",
      max_tokens: opts.maxTokens ?? 800,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Anthropic error ${res.status}`);
  }

  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text?: string }) => b.text ?? "")
    .join("")
    .trim();
}
