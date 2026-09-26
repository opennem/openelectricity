/** Transient reads get one delayed retry; speculative traffic never retries. */
const RETRYABLE_STATUS = new Set([408, 500, 502, 503, 504]);
export const CHART_RETRY_DELAY_MS = 750;

/** @param {AbortSignal} signal */
function abortError(signal) {
	return signal.reason ?? new DOMException('Aborted', 'AbortError');
}

/** Backoff belongs to the shared request and ends when its last consumer leaves.
 * @param {AbortSignal} signal */
function waitToRetry(signal) {
	return new Promise((resolve, reject) => {
		if (signal.aborted) return reject(abortError(signal));
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve(undefined);
		}, CHART_RETRY_DELAY_MS);
		function onAbort() {
			clearTimeout(timer);
			signal.removeEventListener('abort', onAbort);
			reject(abortError(signal));
		}
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

/** Preserve the API's message, not raw HTML or arbitrary error-detail objects.
 * @param {Response} response */
async function responseError(response) {
	let message = '';
	try {
		const body = await response.json();
		if (typeof body?.error === 'string' && !/<[^>]*>/.test(body.error)) {
			message = body.error.replace(/\s+/g, ' ').trim().slice(0, 300);
		}
	} catch {
		// Gateways may return HTML, empty bodies or malformed JSON.
	}
	return new Error(`Data request failed (${response.status})${message ? `: ${message}` : ''}`);
}

/** Fetch and decode one shared chart request. Authentication, validation and
 * rate-limit errors are surfaced immediately, not retried in a burst.
 * @param {string} url
 * @param {{ signal: AbortSignal, priority?: 'low', cache?: RequestCache }} options - `cache`
 *   'no-cache' revalidates with the server, skipping the browser's max-age copy
 * @returns {Promise<any>} */
export async function fetchChartResponse(url, { signal, priority, cache }) {
	for (let attempt = 0; ; attempt++) {
		if (signal.aborted) throw abortError(signal);
		const response = await fetch(url, { signal, priority, cache });
		if (response.ok) return (await response.json()).response;
		const error = await responseError(response);
		if (attempt > 0 || priority === 'low' || !RETRYABLE_STATUS.has(response.status)) throw error;
		await waitToRetry(signal);
	}
}
