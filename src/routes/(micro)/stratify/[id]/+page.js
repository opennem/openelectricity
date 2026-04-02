/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	return { chartId: params.id };
}
