import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { trackerView } from './tracker-url.js';

/** Each view is its own route; `/tracker` (and the retired `?view=` links)
 * land on it with the rest of the query intact. */
export function load({ url }) {
	const params = new URLSearchParams(url.searchParams);
	const { route } = trackerView(params.get('view'));
	params.delete('view');
	const query = params.size ? `?${params}` : '';
	redirect(307, `${resolve(route)}${query}`);
}
