/**
 * Same-origin relay for everything the browser sends to Sentry (errors,
 * session replays, feedback), served at `/api/feedback`. The path is neutral
 * on purpose: ad blockers and tracking protection block `*.ingest.sentry.io`
 * and URLs that name Sentry. The SDK's `tunnel` option posts envelopes here,
 * and the route forwards them only when they are addressed to our own
 * project, so it can't relay to anyone else's.
 */

/** Generous for a replay segment, or feedback with a full-page screenshot. */
export const MAX_ENVELOPE_BYTES = 10 * 1024 * 1024;

/**
 * Sentry's envelope endpoint for a DSN, or null when it isn't a valid DSN.
 * @param {string} dsn
 */
export function envelopeEndpoint(dsn) {
	try {
		const url = new URL(dsn);
		const projectId = url.pathname.split('/').filter(Boolean).at(-1);
		if (!url.username || !projectId || !/^\d+$/.test(projectId)) return null;
		return `${url.protocol}//${url.host}/api/${projectId}/envelope/`;
	} catch {
		return null;
	}
}

/**
 * The envelope's header: its first line of JSON. Later items may be binary
 * (screenshots, replay recordings), so only that line is decoded.
 * @param {Uint8Array} envelope
 * @returns {{ text: string, header: Record<string, unknown> | null }}
 */
function readEnvelopeHeader(envelope) {
	const newline = envelope.indexOf(10);
	const text = new TextDecoder().decode(newline === -1 ? envelope : envelope.subarray(0, newline));
	try {
		const header = JSON.parse(text);
		return { text, header: header && typeof header === 'object' ? header : null };
	} catch {
		return { text, header: null };
	}
}

/**
 * Where to forward an envelope: our project's endpoint when the envelope's
 * header names our DSN (matched on host and project, which identify the
 * destination), otherwise null.
 * @param {Uint8Array} envelope
 * @param {string} configuredDsn
 */
export function tunnelTarget(envelope, configuredDsn) {
	const { header } = readEnvelopeHeader(envelope);
	if (typeof header?.dsn !== 'string') return null;
	const requested = envelopeEndpoint(header.dsn);
	const allowed = envelopeEndpoint(configuredDsn);
	return requested && requested === allowed ? allowed : null;
}

/**
 * What a refused envelope's header looked like, for the server log: its
 * size, its header keys, and the DSN's host and project only (never the key
 * or any content).
 * @param {Uint8Array} envelope
 */
export function envelopeHeaderSummary(envelope) {
	const { text, header } = readEnvelopeHeader(envelope);
	if (!header) return { bytes: envelope.byteLength, unparsedStart: text.slice(0, 40) };
	let dsn = null;
	try {
		dsn = typeof header.dsn === 'string' ? new URL(header.dsn) : null;
	} catch {
		dsn = null;
	}
	return {
		bytes: envelope.byteLength,
		headerKeys: Object.keys(header),
		dsn: dsn ? `${dsn.host}${dsn.pathname}` : null
	};
}
