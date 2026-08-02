/**
 * All AI calls go through /api/analyze (server-side).
 * The Anthropic API key is stored in ANTHROPIC_API_KEY (no NEXT_PUBLIC_ prefix)
 * and never exposed to the browser.
 */

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnalyzePayload {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
}

interface AnalyzeResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string;
}

export async function callAnalyzeAPI(
  payload: AnalyzePayload
): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error ?? `API error ${res.status}`);
  }

  return data as AnalyzeResponse;
}

/**
 * Extract text from Anthropic response content blocks.
 */
export function extractText(response: AnalyzeResponse): string {
  return (response.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}
