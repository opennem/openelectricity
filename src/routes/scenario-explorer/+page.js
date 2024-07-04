import lzString from 'lz-string';

/** @type {import('./$types').PageLoad} */
export async function load({ data, url }) {
	const filters = url.searchParams.get('filters');

	return {
		...data, // pipe through data from PageServer

		filters: filters ? JSON.parse(lzString.decompressFromEncodedURIComponent(filters)) : null
	};
}
