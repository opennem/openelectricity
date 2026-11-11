import { loadComparisonCpi } from '#lib/server/comparison-cpi.js';
import { edgeRuntime } from '#lib/server/edge-runtime.js';
export async function load() {
	return { comparisonCpi: await loadComparisonCpi(edgeRuntime()) };
}
