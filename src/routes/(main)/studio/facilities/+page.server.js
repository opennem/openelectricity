import { PUBLIC_OE_API_URL, PUBLIC_OE_API_KEY } from '$env/static/public';

export async function load({ fetch }) {
	console.log('fetching facilities', PUBLIC_OE_API_URL);
	try {
		const response = await fetch(`${PUBLIC_OE_API_URL}/facilities/?with_clerk=true`, {
			headers: {
				Authorization: `Bearer ${PUBLIC_OE_API_KEY}`
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}

		const facilities = await response.json();

		if (facilities.success) {
			console.log(facilities);
			return {
				facilities: facilities.data,
				apiVersion: facilities.version,
				createdAt: facilities.created_at
			};
		} else {
			console.error(facilities);
			throw new Error('Unable to fetch facilities');
		}
	} catch (error) {
		console.error(error);
		return { error: 'Unable to fetch facilities' };
	}
}
