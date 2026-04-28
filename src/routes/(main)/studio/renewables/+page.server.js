import { fetchRenewablesInput } from '$lib/oe-api/fetch-renewables.server';

export const prerender = false;

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const renewablesInput = await fetchRenewablesInput(fetch);
	return { renewablesInput };
}
