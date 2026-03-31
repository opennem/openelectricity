<script>
	import Switch from '$lib/components/Switch.svelte';
	import {
		CHART_FAMILIES,
		getFamily,
		getAvailableFamilies,
		getDefaultForFamily
	} from '$lib/components/charts/v2/chart-families.js';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();

	let availableFamilies = $derived(getAvailableFamilies(project.isCategory));

	let familyButtons = $derived(
		availableFamilies.map((f) => ({ label: CHART_FAMILIES[f].label, value: f }))
	);

	let currentFamily = $derived(getFamily(project.chartType));

	/** @param {string} family */
	function handleFamilyChange(family) {
		project.chartType = /** @type {import('../_state/StratifyPlotProject.svelte.js').ChartType} */ (
			getDefaultForFamily(/** @type {import('$lib/components/charts/v2/chart-families.js').ChartFamily} */ (family))
		);
	}

	let familyConfig = $derived(CHART_FAMILIES[currentFamily]);

	let variantButtons = $derived(
		familyConfig.variants.map((v) => ({
			label: familyConfig.variantLabels[v] ?? v,
			value: v
		}))
	);

	let visibleSeriesCount = $derived(
		project.parsedData.seriesNames.filter((name) => !project.hiddenSeries.includes(name)).length
	);

	let showVariants = $derived(familyConfig.variants.length > 1 && visibleSeriesCount > 1);

	/** @param {string} variant */
	function handleVariantChange(variant) {
		project.chartType = /** @type {import('../_state/StratifyPlotProject.svelte.js').ChartType} */ (variant);
	}
</script>

<div class="flex flex-col gap-2">
	<Switch
		buttons={familyButtons}
		selected={currentFamily}
		onChange={handleFamilyChange}
	/>

	{#if showVariants}
		<Switch
			buttons={variantButtons}
			selected={project.chartType}
			onChange={handleVariantChange}
		/>
	{/if}
</div>
