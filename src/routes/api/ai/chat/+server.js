/**
 * AI Chat Proxy — streams responses from OpenAI, Anthropic, or Google Gemini APIs.
 *
 * Stateless pass-through: API keys arrive in the request body, are forwarded
 * to the provider, and never stored or logged. Both providers' streaming
 * formats are normalised to a simple SSE format:
 *   data: {"content":"token"}
 *   data: [DONE]
 */

import {
	extractAnthropicSystem,
	toGeminiFormat,
	createNormalisedStream,
	SSE_HEADERS
} from '../_providers.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const { provider, model, apiKey, messages, stream = true } = await request.json();

	if (!apiKey) return new Response('Missing API key', { status: 401 });
	if (!['openai', 'anthropic', 'google'].includes(provider)) {
		return new Response('Invalid provider', { status: 400 });
	}
	if (!model || !Array.isArray(messages) || messages.length === 0) {
		return new Response('Invalid request body', { status: 400 });
	}

	try {
		if (stream) {
			if (provider === 'openai') {
				return proxyOpenAI(apiKey, model, messages);
			} else if (provider === 'anthropic') {
				return proxyAnthropic(apiKey, model, messages);
			} else {
				return proxyGemini(apiKey, model, messages);
			}
		} else {
			if (provider === 'openai') {
				return fetchOpenAI(apiKey, model, messages);
			} else if (provider === 'anthropic') {
				return fetchAnthropic(apiKey, model, messages);
			} else {
				return fetchGemini(apiKey, model, messages);
			}
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Proxy error';
		return new Response(msg, { status: 502 });
	}
}

// ---- Streaming proxy functions ----

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {Array<{ role: string, content: string }>} messages
 */
async function proxyOpenAI(apiKey, model, messages) {
	const res = await fetch(OPENAI_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ model, messages, stream: true, temperature: 0.3, max_tokens: 2048 })
	});

	if (!res.ok) return new Response(await res.text(), { status: res.status });

	const reader = /** @type {ReadableStream<Uint8Array>} */ (res.body).getReader();
	const stream = createNormalisedStream(reader, (json) => {
		const content = json.choices?.[0]?.delta?.content;
		return content ? { content } : null;
	});

	return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {Array<{ role: string, content: string }>} messages
 */
async function proxyAnthropic(apiKey, model, messages) {
	const { system, filteredMessages } = extractAnthropicSystem(messages);

	/** @type {Record<string, any>} */
	const body = { model, messages: filteredMessages, stream: true, max_tokens: 2048, temperature: 0.3 };
	if (system) body.system = system;

	const res = await fetch(ANTHROPIC_URL, {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) return new Response(await res.text(), { status: res.status });

	const reader = /** @type {ReadableStream<Uint8Array>} */ (res.body).getReader();
	const stream = createNormalisedStream(reader, (json) => {
		if (json.type === 'content_block_delta') {
			const text = json.delta?.text;
			return text ? { content: text } : null;
		}
		if (json.type === 'message_stop') return { done: true };
		if (json.type === 'error') {
			return { error: json.error?.message || 'Unknown Anthropic error' };
		}
		return null;
	});

	return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {Array<{ role: string, content: string }>} messages
 */
async function proxyGemini(apiKey, model, messages) {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
	const { contents, systemText } = toGeminiFormat(messages);

	/** @type {Record<string, any>} */
	const body = { contents, generationConfig: { temperature: 0.3, maxOutputTokens: 2048 } };
	if (systemText) body.system_instruction = { parts: [{ text: systemText }] };

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) return new Response(await res.text(), { status: res.status });

	const reader = /** @type {ReadableStream<Uint8Array>} */ (res.body).getReader();
	const stream = createNormalisedStream(
		reader,
		(json) => {
			if (json.error) {
				return { error: json.error.message || 'Unknown Gemini error' };
			}
			const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
			return text ? { content: text } : null;
		},
		{ emitDoneOnEnd: true }
	);

	return new Response(stream, { headers: SSE_HEADERS });
}

// ---- Non-streaming fetch functions (for Pass 1 query generation) ----

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {Array<{ role: string, content: string }>} messages
 */
async function fetchOpenAI(apiKey, model, messages) {
	const res = await fetch(OPENAI_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ model, messages, stream: false, temperature: 0.1, max_tokens: 1024 })
	});

	if (!res.ok) return new Response(await res.text(), { status: res.status });

	const json = await res.json();
	return Response.json({ content: json.choices?.[0]?.message?.content || '' });
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {Array<{ role: string, content: string }>} messages
 */
async function fetchAnthropic(apiKey, model, messages) {
	const { system, filteredMessages } = extractAnthropicSystem(messages);

	/** @type {Record<string, any>} */
	const body = { model, messages: filteredMessages, stream: false, max_tokens: 1024, temperature: 0.1 };
	if (system) body.system = system;

	const res = await fetch(ANTHROPIC_URL, {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) return new Response(await res.text(), { status: res.status });

	const json = await res.json();
	return Response.json({ content: json.content?.[0]?.text || '' });
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {Array<{ role: string, content: string }>} messages
 */
async function fetchGemini(apiKey, model, messages) {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
	const { contents, systemText } = toGeminiFormat(messages);

	/** @type {Record<string, any>} */
	const body = { contents, generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } };
	if (systemText) body.system_instruction = { parts: [{ text: systemText }] };

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) return new Response(await res.text(), { status: res.status });

	const json = await res.json();
	return Response.json({ content: json.candidates?.[0]?.content?.parts?.[0]?.text || '' });
}
