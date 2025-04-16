import { json, text } from '@sveltejs/kit';
import md5 from 'md5';
import { MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
	const { email } = await request.json();
	const lowerCaseEmail = email.toLowerCase();
	const response = await fetch(
		`https://us13.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members/${md5(lowerCaseEmail)}`,
		{
			method: 'PUT',
			headers: {
				Authorization: `apikey ${MAILCHIMP_API_KEY}`
			},
			body: JSON.stringify({
				email_address: lowerCaseEmail,
				status_if_new: 'pending'
			})
		}
	);

	const data = await response.json();

	return json({
		email: data.email_address,
		status: data.status
	});
}

// This handler will respond to POST, PATCH, DELETE, etc.
/** @type {import('./$types').RequestHandler} */
export async function fallback({ request }) {
	return text('Nothing to see here');
}
