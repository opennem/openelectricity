/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return { chartId: params.id };
}
