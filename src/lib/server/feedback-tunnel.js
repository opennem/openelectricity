/**
 * Same-origin tunnel for Sentry feedback envelopes (`/api/feedback`).
 *
 * Ad blockers and browser tracking protection block requests to
 * `*.ingest.sentry.io`, which made feedback fail for many readers. The SDK's
 * `tunnel` option posts envelopes to this site instead, and the route forwards
 * them — only when the envelope is addressed to our own project, so the route
 * can't relay to anyone else's.
 */

/** Generous for a feedback message plus a full-page screenshot. */
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
 * Where to forward an envelope: our project's endpoint when the envelope's
 * header names our DSN (matched on host and project, which identify the
 * destination), otherwise null.
 *
 * The header is the envelope's first line of JSON; later items may be
 * binary (screenshots), so only that line is decoded.
 * @param {Uint8Array} envelope
 * @param {string} configuredDsn
 */
export function tunnelTarget(envelope, configuredDsn) {
	const newline = envelope.indexOf(10);
	const headerBytes = newline === -1 ? envelope : envelope.subarray(0, newline);
	/** @type {{ dsn?: unknown }} */
	let header;
	try {
		header = JSON.parse(new TextDecoder().decode(headerBytes));
	} catch {
		return null;
	}
	if (typeof header?.dsn !== 'string') return null;
	const requested = envelopeEndpoint(header.dsn);
	const allowed = envelopeEndpoint(configuredDsn);
	return requested && requested === allowed ? allowed : null;
}

/**
 * What a refused envelope's header looked like, for the server log: its
 * size, whether the first line parsed, and the DSN's host and project only
 * (never the key or any feedback content).
 * @param {Uint8Array} envelope
 */
export function envelopeHeaderSummary(envelope) {
	const newline = envelope.indexOf(10);
	const first = new TextDecoder().decode(
		newline === -1 ? envelope.subarray(0, 200) : envelope.subarray(0, Math.min(newline, 2000))
	);
	try {
		const header = JSON.parse(first);
		const dsn = typeof header?.dsn === 'string' ? new URL(header.dsn) : null;
		return {
			bytes: envelope.byteLength,
			headerKeys: Object.keys(header ?? {}),
			dsn: dsn ? `${dsn.host}${dsn.pathname}` : null
		};
	} catch {
		return { bytes: envelope.byteLength, unparsedStart: first.slice(0, 40) };
	}
}
