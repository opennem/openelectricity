<script>
	/**
	 * Interval Selector Component
	 *
	 * Allows users to switch between different data intervals (e.g., 5min, 30min).
	 * Uses the Switch component for consistent UI.
	 */
	import Switch from '$lib/components/Switch.svelte';

	/**
	 * @typedef {Object} IntervalOption
	 * @property {string} label - Display label
	 * @property {string} value - Interval value
	 */

	/**
	 * @typedef {Object} Props
	 * @property {IntervalOption[]} options - Available interval options
	 * @property {string} selected - Currently selected interval
	 * @property {(interval: string) => void} [onchange] - Callback when interval changes
	 * @property {string} [class] - Additional CSS classes
	 */

	/** @type {Props} */
	let { options, selected, onchange, class: className = '' } = $props();

	/**
	 * @param {string} value
	 */
	function handleChange(value) {
		if (value !== selected) {
			onchange?.(value);
		}
	}
</script>

<div class="flex items-center gap-2 {className}">
	<span class="text-xs text-gray-500 font-medium">Interval</span>
	<Switch
		buttons={options}
		{selected}
		onChange={handleChange}
		xPad={3}
		yPad={1}
		textSize="xs"
		roundedSize="lg"
	/>
</div>
