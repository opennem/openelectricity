import { comparisonCpi } from '$lib/server/comparison-cpi.js';
export async function load({ platform }) {
	return { comparisonCpi: await comparisonCpi.get(platform) };
}
