// Groq API Client for AlphaGrad ERP Cloudflare Worker

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface GroqCallOptions {
	apiKey?: string;
	model?: string;
	messages: ChatMessage[];
	temperature?: number;
	max_tokens?: number;
	response_format?: { type: "json_object" | "text" };
	timeoutMs?: number;
}

export interface GroqCallResult {
	content: string;
	model: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	estimatedCostUsd: number;
	durationMs: number;
}

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const FAST_MODEL = "openai/gpt-oss-120b";

export function estimateGroqCost(model: string, promptTokens: number, completionTokens: number): number {
	// ~$0.50 / 1M prompt, $0.75 / 1M completion
	return (promptTokens * 0.50 + completionTokens * 0.75) / 1_000_000;
}

export async function callGroqChat(options: GroqCallOptions): Promise<GroqCallResult> {
	const apiKey = options.apiKey?.trim();
	if (!apiKey) {
		throw new Error("GROQ_API_KEY is not configured on the server environment.");
	}

	const model = options.model || DEFAULT_MODEL;
	const temperature = options.temperature ?? 0.2;
	const maxTokens = options.max_tokens ?? 3500;
	const timeoutMs = options.timeoutMs ?? 35000;

	const requestBody: any = {
		model,
		messages: options.messages,
		temperature,
		max_tokens: maxTokens,
	};

	if (options.response_format) {
		requestBody.response_format = options.response_format;
	}

	const startTime = Date.now();
	let lastError: any = null;
	const maxAttempts = 2;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!res.ok) {
				const errorJson: any = await res.json().catch(() => ({}));
				const errorMsg = errorJson?.error?.message || `Groq API responded with status ${res.status} (${res.statusText})`;

				if (res.status === 429) {
					throw new Error(`Rate limit exceeded on Groq model provider: ${errorMsg}`);
				}
				if (res.status === 401) {
					throw new Error(`Invalid or unauthorized GROQ_API_KEY: ${errorMsg}`);
				}

				// Retry on 5xx transient server errors
				if (res.status >= 500 && attempt < maxAttempts) {
					await new Promise((r) => setTimeout(r, attempt * 1000));
					continue;
				}

				throw new Error(errorMsg);
			}

			const data: any = await res.json();
			const durationMs = Date.now() - startTime;

			const choice = data?.choices?.[0];
			const content = choice?.message?.content || "";
			const promptTokens = data?.usage?.prompt_tokens || 0;
			const completionTokens = data?.usage?.completion_tokens || 0;
			const totalTokens = data?.usage?.total_tokens || promptTokens + completionTokens;
			const estimatedCostUsd = estimateGroqCost(model, promptTokens, completionTokens);

			return {
				content,
				model,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens,
				},
				estimatedCostUsd,
				durationMs,
			};
		} catch (err: any) {
			clearTimeout(timeoutId);
			lastError = err;
			if (err?.name === "AbortError") {
				throw new Error(`Groq request timed out after ${timeoutMs / 1000} seconds`);
			}
			if (attempt < maxAttempts) {
				await new Promise((r) => setTimeout(r, attempt * 800));
			}
		}
	}

	throw lastError || new Error("Failed to communicate with Groq AI service.");
}

/**
 * Safely cleans and extracts structured JSON from model output,
 * stripping markdown fences ```json ... ``` or loose preamble text.
 */
export function extractJsonFromResponse<T = any>(rawText: string): T {
	let text = rawText.trim();

	// Remove markdown code fences if present
	if (text.startsWith("```json")) {
		text = text.substring(7);
	} else if (text.startsWith("```")) {
		text = text.substring(3);
	}

	if (text.endsWith("```")) {
		text = text.slice(0, -3);
	}

	text = text.trim();

	// If there are leading non-JSON characters, find the first '{' or '['
	const firstBrace = text.indexOf("{");
	const firstBracket = text.indexOf("[");

	let startIndex = 0;
	if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
		startIndex = firstBrace;
		const lastBrace = text.lastIndexOf("}");
		if (lastBrace > startIndex) {
			text = text.substring(startIndex, lastBrace + 1);
		}
	} else if (firstBracket !== -1) {
		startIndex = firstBracket;
		const lastBracket = text.lastIndexOf("]");
		if (lastBracket > startIndex) {
			text = text.substring(startIndex, lastBracket + 1);
		}
	}

	try {
		return JSON.parse(text) as T;
	} catch (parseError: any) {
		throw new Error(`Failed to parse AI structured response: ${parseError.message}. Content was: ${rawText.slice(0, 200)}...`);
	}
}
