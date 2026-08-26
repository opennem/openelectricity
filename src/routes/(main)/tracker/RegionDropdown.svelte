<script>
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { DEFAULT_REGION, TRACKER_REGION_OPTIONS } from './tracker-regions.js';

	/**
	 * Single-select region dropdown — a thin wrapper over the shared
	 * FilterSelect pill, providing the tracker region list and its
	 * deviation-aware default.
	 * @type {{
	 *   selected: string,
	 *   compact?: boolean,
	 *   options?: typeof TRACKER_REGION_OPTIONS,
	 *   defaultValue?: string,
	 *   onchange?: (value: string) => void
	 * }}
	 */
	let {
		selected,
		compact = false,
		options = TRACKER_REGION_OPTIONS,
		// The pill goes active (dark) when deviating from this — pages whose
		// default scope isn't All Regions (e.g. the NEM-default tracker) pass
		// their own.
		defaultValue = DEFAULT_REGION,
		onchange
	} = $props();
</script>

<FilterSelect {selected} {options} listLabel="Region" {defaultValue} {compact} {onchange} />
