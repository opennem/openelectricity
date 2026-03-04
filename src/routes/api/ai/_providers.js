/**
 * Shared provider helpers for AI chat proxy.
 *
 * Extracts the duplicated patterns from the 6 provider functions:
 * - Anthropic system message extraction
 * - Gemini format conversion
 * - SSE stream normalisation
 */

/**
 * Extract system messages from the OpenAI-style messages array.
 * Anthropic expects the system prompt as a top-level param rather than
 * a message with role "system".
 * @param {Array<{ role: string, content: string }>} messages
 * @returns {{ system: string, filteredMessages: Array<{ role: string, content: string }> }}
 */
export function extractAnthropicSystem(messages) {
	let system = '';
	const filteredMessages = [];
	for (const msg of messages) {
		if (msg.role === 'system') {
			system += (system ? '\n\n' : '') + msg.content;
		} else {
			filteredMessages.push(msg);
		}
	}
	return { system, filteredMessages };
}

/**
 * Convert OpenAI-style messages to Gemini format.
 * Gemini uses "model" instead of "assistant", parts-based content,
 * and system_instruction as a top-level field.
 * @param {Array<{ role: string, content: string }>} messages
 * @returns {{ contents: Array<{ role: string, parts: Array<{ text: string }> }>, systemText: string }}
 */
export function toGeminiFormat(messages) {
	let systemText = '';
	const contents = [];
	for (const msg of messages) {
		if (msg.role === 'system') {
			systemText += (systemText ? '\n\n' : '') + msg.content;
		} else {
			contents.push({
				role: msg.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: msg.content }]
			});
		}
	}
	return { contents, systemText };
}

/**
 * Create a normalised SSE ReadableStream from an upstream reader.
 * Handles the common buffer/decoder/line-splitting/[DONE] pattern
 * shared by all three provider proxies.
 *
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {(json: any) => { content?: string, error?: string, done?: boolean } | null} extractContent
 *   Callback that receives a parsed JSON object from an SSE data line
 *   and returns { content } for tokens, { error } for errors, { done: true }
 *   for stream-end, or null to skip the line.
 * @param {{ emitDoneOnEnd?: boolean }} [options]
 *   If emitDoneOnEnd is true, a [DONE] event is emitted when the upstream
 *   reader ends (used by Gemini which doesn't send its own [DONE]).
 * @returns {ReadableStream}
 */
export function createNormalisedStream(reader, extractContent, options = {}) {
	const decoder = new TextDecoder();
	const { emitDoneOnEnd = false } = options;

	return new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let buffer = '';

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || !trimmed.startsWith('data: ')) continue;

						const payload = trimmed.slice(6);
						if (payload === '[DONE]') {
							controller.enqueue(encoder.encode('data: [DONE]\n\n'));
							continue;
						}

						try {
							const json = JSON.parse(payload);
							const result = extractContent(json);
							if (!result) continue;

							if (result.error) {
								controller.enqueue(
									encoder.encode(
										`data: ${JSON.stringify({ error: result.error })}\n\n`
									)
								);
							}
							if (result.content) {
								controller.enqueue(
									encoder.encode(
										`data: ${JSON.stringify({ content: result.content })}\n\n`
									)
								);
							}
							if (result.done) {
								controller.enqueue(encoder.encode('data: [DONE]\n\n'));
							}
						} catch {
							// Skip malformed JSON lines
						}
					}
				}
				if (emitDoneOnEnd) {
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				}
			} finally {
				controller.close();
			}
		}
	});
}

/** Standard SSE response headers */
export const SSE_HEADERS = {
	'Content-Type': 'text/event-stream',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive'
};
