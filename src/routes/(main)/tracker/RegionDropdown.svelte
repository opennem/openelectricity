<script>
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { DEFAULT_REGION, TRACKER_REGION_TREE } from './tracker-regions.js';

	/**
	 * Tracker region selector. NEM states are nested under the whole-NEM option.
	 * @type {{
	 *   selected: string,
	 *   compact?: boolean,
	 *   options?: typeof TRACKER_REGION_TREE,
	 *   defaultValue?: string,
	 *   onchange?: (value: string) => void
	 * }}
	 */
	let {
		selected,
		compact = false,
		options = TRACKER_REGION_TREE,
		// The pill goes active (dark) when deviating from this — pages whose
		// default scope isn't All Regions (e.g. the NEM-default tracker) pass
		// their own.
		defaultValue = DEFAULT_REGION,
		onchange
	} = $props();
</script>

<FilterSelect {selected} {options} listLabel="Region" {defaultValue} {compact} {onchange} />
