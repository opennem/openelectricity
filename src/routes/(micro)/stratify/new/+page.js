/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	return { templateSlug: url.searchParams.get('template')?.trim() ?? '' };
}
