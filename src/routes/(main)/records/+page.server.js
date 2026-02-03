import { PUBLIC_RECORDS_API, PUBLIC_API_KEY } from '$env/static/public';
import { fetchPinnedRecords } from '$lib/records/pinned-records.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const pinnedRecords = await fetchPinnedRecords(fetch, PUBLIC_RECORDS_API, PUBLIC_API_KEY);

	return {
		pinnedRecords
	};
}
