import { error } from '@sveltejs/kit';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

export async function GET({ params, setHeaders }) {
	const { code } = params;

	if (!code) {
		return error(400, 'Missing facility code');
	}

	try {
		const url = `${PUBLIC_OE_API_URL}/facilities/?facility_code=${encodeURIComponent(code)}`;
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${PUBLIC_OE_API_KEY}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			return error(response.status, 'Failed to fetch facility');
		}

		const data = await response.json();
		const facility = data.data?.[0] ?? null;

		if (!facility) {
			return error(404, 'Facility not found');
		}

		setHeaders({
			'Cache-Control': 'public, max-age=300'
		});

		return Response.json(facility);
	} catch (err) {
		console.error('Error fetching facility:', err);
		return error(500, 'Failed to fetch facility');
	}
}
