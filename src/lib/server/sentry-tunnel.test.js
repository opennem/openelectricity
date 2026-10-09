import { describe, expect, it } from 'vitest';
import { envelopeEndpoint, tunnelTarget } from './sentry-tunnel.js';

const DSN = 'https://abc123@o402615.ingest.us.sentry.io/4512223945555968';
const ENDPOINT = 'https://o402615.ingest.us.sentry.io/api/4512223945555968/envelope/';

/** An envelope whose header names `dsn`, followed by a binary item. */
function envelope(/** @type {Record<string, unknown>} */ header) {
	const head = new TextEncoder().encode(`${JSON.stringify(header)}\n{"type":"attachment"}\n`);
	const binary = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0a, 0xff]);
	const out = new Uint8Array(head.length + binary.length);
	out.set(head);
	out.set(binary, head.length);
	return out;
}

describe('envelopeEndpoint', () => {
	it("builds the project's envelope URL from a DSN", () => {
		expect(envelopeEndpoint(DSN)).toBe(ENDPOINT);
	});

	it('rejects strings that are not DSNs', () => {
		expect(envelopeEndpoint('not a url')).toBeNull();
		expect(envelopeEndpoint('https://o1.ingest.sentry.io/123')).toBeNull();
		expect(envelopeEndpoint('https://key@o1.ingest.sentry.io/')).toBeNull();
	});
});

describe('tunnelTarget', () => {
	it('forwards envelopes addressed to our project, binary items and all', () => {
		expect(tunnelTarget(envelope({ dsn: DSN, event_id: 'x' }), DSN)).toBe(ENDPOINT);
	});

	it('refuses envelopes for any other project or host', () => {
		const otherProject = 'https://abc123@o402615.ingest.us.sentry.io/1';
		const otherHost = 'https://abc123@evil.example/4512223945555968';
		expect(tunnelTarget(envelope({ dsn: otherProject }), DSN)).toBeNull();
		expect(tunnelTarget(envelope({ dsn: otherHost }), DSN)).toBeNull();
	});

	it('refuses envelopes without a readable DSN header', () => {
		expect(tunnelTarget(envelope({ event_id: 'x' }), DSN)).toBeNull();
		expect(tunnelTarget(new TextEncoder().encode('garbage\n{}'), DSN)).toBeNull();
		expect(tunnelTarget(new Uint8Array(), DSN)).toBeNull();
	});
});
