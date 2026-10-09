import { env } from '$env/dynamic/public';
import { resolveFeedbackDsn } from '$lib/feedback/feedback-context.js';
import {
	MAX_ENVELOPE_BYTES,
	envelopeHeaderSummary,
	tunnelTarget
} from '$lib/server/feedback-tunnel.js';

/**
 * Sentry feedback tunnel: the browser SDK posts envelopes here (its `tunnel`
 * option) so ad blockers don't stop feedback, and they are forwarded to our
 * Sentry project only. The reader's IP and headers are not passed on.
 * See `$lib/server/feedback-tunnel.js`.
 */
export async function POST({ request }) {
	const dsn = resolveFeedbackDsn(env);
	if (!dsn) return new Response(null, { status: 404 });

	const declared = Number(request.headers.get('content-length'));
	if (declared > MAX_ENVELOPE_BYTES) return new Response(null, { status: 413 });
	const envelope = new Uint8Array(await request.arrayBuffer());
	if (envelope.byteLength > MAX_ENVELOPE_BYTES) return new Response(null, { status: 413 });

	const target = tunnelTarget(envelope, dsn);
	if (!target) {
		console.warn('Feedback tunnel refused an envelope:', envelopeHeaderSummary(envelope));
		return new Response(null, { status: 400 });
	}

	try {
		const upstream = await fetch(target, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-sentry-envelope' },
			body: envelope
		});
		if (!upstream.ok) {
			// Sentry explains rejections in a JSON `detail`; never the message itself.
			console.warn('Sentry rejected forwarded feedback:', upstream.status, await upstream.text());
		}
		// The SDK reads only the status: 2xx sent, 403 refused, else failed.
		return new Response(null, { status: upstream.status });
	} catch (err) {
		console.error('Feedback tunnel could not reach Sentry:', err);
		return new Response(null, { status: 502 });
	}
}
