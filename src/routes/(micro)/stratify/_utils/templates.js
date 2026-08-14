import { getBuiltInExample, getCommunityExample } from '$lib/stratify/example-catalogue.js';

/**
 * Load a documentation example as a new unsaved project.
 * @param {import('../_state/StratifyPlotProject.svelte.js').default} project
 * @param {string} slug
 * @param {(id: string) => Promise<Record<string, any>>} fetchChart
 */
export async function loadExampleTemplate(project, slug, fetchChart) {
	const builtIn = getBuiltInExample(slug);
	if (builtIn) {
		project.loadExample(builtIn);
		return true;
	}

	const community = getCommunityExample(slug);
	if (!community) return false;
	const chart = await fetchChart(community.chartId);
	project.loadFromSnapshot(/** @type {any} */ ({ ...chart, status: 'draft' }));
	project.currentChartId = null;
	return true;
}
