import { describe, expect, it, vi } from 'vitest';
import { normaliseEmail, subscribe } from './newsletter.js';

/**
 * A fetch that answers each call with the next queued Mailchimp response.
 * @param {...{ status?: number, body: object }} responses
 */
function mailchimp(...responses) {
	return vi.fn(async () => {
		const { status = 200, body } = responses.shift() ?? { body: {} };
		return new Response(JSON.stringify(body), { status });
	});
}

const options = { apiKey: 'key', listId: 'list' };

describe('normaliseEmail', () => {
	it('trims and lower-cases an address', () => {
		expect(normaliseEmail('  Reader@Example.COM ')).toBe('reader@example.com');
	});

	it('rejects anything that isn’t an address', () => {
		for (const value of [undefined, null, 42, '', 'reader', 'reader@example', 'a b@example.com']) {
			expect(normaliseEmail(value)).toBeNull();
		}
	});
});

describe('subscribe', () => {
	it('adds a new address as pending, so Mailchimp sends the confirmation', async () => {
		const fetch = mailchimp({ body: { status: 'pending' } });
		expect(await subscribe('Reader@example.com', { fetch, ...options })).toEqual({ ok: true });
		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, init] = /** @type {any} */ (fetch.mock.calls[0]);
		expect(url).toMatch(/\/lists\/list\/members\/[0-9a-f]{32}$/);
		expect(init.method).toBe('PUT');
		expect(JSON.parse(init.body)).toEqual({
			email_address: 'reader@example.com',
			status_if_new: 'pending'
		});
	});

	it('answers the same for an address that is already subscribed', async () => {
		const fetch = mailchimp({ body: { status: 'subscribed' } });
		expect(await subscribe('reader@example.com', { fetch, ...options })).toEqual({ ok: true });
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('lets a reader who unsubscribed rejoin by confirming again', async () => {
		const fetch = mailchimp({ body: { status: 'unsubscribed' } }, { body: { status: 'pending' } });
		expect(await subscribe('reader@example.com', { fetch, ...options })).toEqual({ ok: true });
		const [, init] = /** @type {any} */ (fetch.mock.calls[1]);
		expect(init.method).toBe('PATCH');
		expect(JSON.parse(init.body)).toEqual({ status: 'pending' });
	});

	it('answers the same for an address Mailchimp won’t re-add', async () => {
		const fetch = mailchimp({ status: 400, body: { title: 'Member In Compliance State' } });
		expect(await subscribe('reader@example.com', { fetch, ...options })).toEqual({ ok: true });
	});

	it('rejects an invalid address without calling Mailchimp', async () => {
		const fetch = mailchimp();
		expect(await subscribe('not an email', { fetch, ...options })).toEqual({
			ok: false,
			reason: 'invalid'
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it('passes on an address Mailchimp judges fake', async () => {
		const fetch = mailchimp({ status: 400, body: { title: 'Invalid Resource' } });
		expect(await subscribe('reader@example.com', { fetch, ...options })).toEqual({
			ok: false,
			reason: 'invalid'
		});
	});

	it('reports a failure rather than success when Mailchimp errors', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const failed = mailchimp({ status: 401, body: { title: 'API Key Invalid' } });
		expect(await subscribe('reader@example.com', { fetch: failed, ...options })).toEqual({
			ok: false,
			reason: 'unavailable'
		});
		const offline = vi.fn(async () => {
			throw new TypeError('fetch failed');
		});
		expect(await subscribe('reader@example.com', { fetch: offline, ...options })).toEqual({
			ok: false,
			reason: 'unavailable'
		});
	});
});
