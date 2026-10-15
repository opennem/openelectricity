import md5 from 'md5';

/**
 * Newsletter sign-up through Mailchimp's double opt-in.
 *
 * Every accepted address gets the same answer, whatever its list status, so
 * the form can't be used to find out who is subscribed. Mailchimp emails a
 * confirmation link to new addresses (`status_if_new: 'pending'`) and, after
 * a second request, to readers who unsubscribed and want to rejoin. An
 * address that is already pending isn't emailed again, so repeating a
 * sign-up can't flood someone's inbox.
 */

const MAILCHIMP_API = 'https://us13.api.mailchimp.com/3.0';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mailchimp refusals that mean "this address can't be added by the API",
 * not "something broke": a contact in a compliance state (unsubscribed by
 * an admin, bounced, flagged) or one permanently deleted on request. They
 * get the same answer as any accepted address.
 */
const QUIET_REFUSALS = new Set(['Member In Compliance State', 'Forgotten Email Not Subscribed']);

/**
 * @typedef {{ ok: true } | { ok: false, reason: 'invalid' | 'unavailable' }} SignupResult
 */

/**
 * The address to sign up, normalised, or null when it isn't one.
 * @param {unknown} email
 */
export function normaliseEmail(email) {
	if (typeof email !== 'string') return null;
	const address = email.trim().toLowerCase();
	return address.length <= 254 && EMAIL_PATTERN.test(address) ? address : null;
}

/**
 * @param {unknown} email - as the reader typed it
 * @param {{ fetch: typeof fetch, apiKey: string, listId: string }} options
 * @returns {Promise<SignupResult>}
 */
export async function subscribe(email, { fetch, apiKey, listId }) {
	const address = normaliseEmail(email);
	if (!address) return { ok: false, reason: 'invalid' };

	const memberUrl = `${MAILCHIMP_API}/lists/${listId}/members/${md5(address)}`;
	const headers = { Authorization: `apikey ${apiKey}` };

	try {
		const response = await fetch(memberUrl, {
			method: 'PUT',
			headers,
			body: JSON.stringify({ email_address: address, status_if_new: 'pending' })
		});
		const member = await response.json();

		if (!response.ok) {
			if (QUIET_REFUSALS.has(member.title)) return { ok: true };
			// Mailchimp rejects addresses it judges fake or malformed.
			if (response.status === 400 && member.title === 'Invalid Resource') {
				return { ok: false, reason: 'invalid' };
			}
			console.error('Newsletter sign-up failed:', response.status, member.title);
			return { ok: false, reason: 'unavailable' };
		}

		// `status_if_new` leaves existing members as they were; a reader who
		// unsubscribed rejoins by confirming again.
		if (member.status === 'unsubscribed') {
			const rejoin = await fetch(memberUrl, {
				method: 'PATCH',
				headers,
				body: JSON.stringify({ status: 'pending' })
			});
			if (!rejoin.ok) {
				console.error('Newsletter re-subscribe failed:', rejoin.status);
				return { ok: false, reason: 'unavailable' };
			}
		}

		return { ok: true };
	} catch (err) {
		console.error('Newsletter sign-up failed:', err);
		return { ok: false, reason: 'unavailable' };
	}
}
