<script>
	import FilterDropdown from '../facilities/_components/filters/FilterDropdown.svelte';
	import {
		COMPARISON_METRICS,
		ALL_COMPARISON_CHARTS,
		COMPARISON_METRIC_GROUPS
	} from './comparison-metrics.js';
	/** @type {{selected:string[],onchange:(charts:string[])=>void}} */
	let { selected, onchange } = $props();
	const options = COMPARISON_METRIC_GROUPS.map((group) => ({
		value: group,
		label: group,
		children: COMPARISON_METRICS.filter((metric) => metric.group === group).map((metric) => ({
			value: metric.id,
			label: metric.label
		}))
	}));
</script>

<FilterDropdown
	label="Charts"
	{selected}
	{options}
	defaults={ALL_COMPARISON_CHARTS}
	defaultExpanded={COMPARISON_METRIC_GROUPS}
	clearLabel="Reset"
	compact
	onapply={onchange}
/>
