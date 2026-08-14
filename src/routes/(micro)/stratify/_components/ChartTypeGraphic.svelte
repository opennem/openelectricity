<script>
	/** @type {{ chartType: import('$lib/stratify/chart-types.js').ChartType }} */
	let { chartType } = $props();
</script>

<svg
	viewBox="0 0 64 32"
	class="h-9 w-18"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if chartType === 'line'}
		<path d="M3 28H61" opacity="0.2" />
		<path d="M4 24L15 18L25 21L36 8L47 13L60 5" />
		<path d="M4 27L15 24L25 14L36 18L47 9L60 12" opacity="0.4" />
	{:else if chartType === 'scatter'}
		<path d="M3 28H61M4 29V3" opacity="0.2" />
		<circle cx="11" cy="23" r="2" fill="currentColor" stroke="none" />
		<circle cx="21" cy="19" r="3.5" fill="currentColor" stroke="none" opacity="0.7" />
		<circle cx="31" cy="21" r="2.5" fill="currentColor" stroke="none" opacity="0.85" />
		<circle cx="42" cy="11" r="4.5" fill="currentColor" stroke="none" opacity="0.55" />
		<circle cx="54" cy="7" r="2.75" fill="currentColor" stroke="none" />
	{:else if chartType === 'area'}
		<path d="M3 28H61" opacity="0.2" />
		<path d="M4 25L15 19L25 22L36 8L47 13L60 5V28H4Z" fill="currentColor" fill-opacity="0.22" />
		<path d="M4 25L15 19L25 22L36 8L47 13L60 5" />
	{:else if chartType === 'column'}
		<path d="M3 29H61" opacity="0.2" />
		<rect x="7" y="18" width="8" height="11" fill="currentColor" fill-opacity="0.35" />
		<rect x="21" y="10" width="8" height="19" fill="currentColor" fill-opacity="0.55" />
		<rect x="35" y="5" width="8" height="24" fill="currentColor" fill-opacity="0.8" />
		<rect x="49" y="14" width="8" height="15" fill="currentColor" />
	{:else if chartType === 'column-stacked'}
		<path d="M3 29H61" opacity="0.2" />
		<rect x="8" y="18" width="10" height="11" fill="currentColor" fill-opacity="0.35" />
		<rect x="8" y="10" width="10" height="8" fill="currentColor" fill-opacity="0.8" />
		<rect x="27" y="14" width="10" height="15" fill="currentColor" fill-opacity="0.35" />
		<rect x="27" y="4" width="10" height="10" fill="currentColor" fill-opacity="0.8" />
		<rect x="46" y="20" width="10" height="9" fill="currentColor" fill-opacity="0.35" />
		<rect x="46" y="8" width="10" height="12" fill="currentColor" fill-opacity="0.8" />
	{:else if chartType === 'column-grouped'}
		<path d="M3 29H61" opacity="0.2" />
		<rect x="6" y="16" width="6" height="13" fill="currentColor" fill-opacity="0.35" />
		<rect x="13" y="10" width="6" height="19" fill="currentColor" fill-opacity="0.85" />
		<rect x="25" y="8" width="6" height="21" fill="currentColor" fill-opacity="0.35" />
		<rect x="32" y="14" width="6" height="15" fill="currentColor" fill-opacity="0.85" />
		<rect x="44" y="19" width="6" height="10" fill="currentColor" fill-opacity="0.35" />
		<rect x="51" y="5" width="6" height="24" fill="currentColor" fill-opacity="0.85" />
	{:else if chartType === 'bar'}
		<path d="M4 3V29" opacity="0.2" />
		<rect x="4" y="4" width="31" height="6" fill="currentColor" fill-opacity="0.35" />
		<rect x="4" y="13" width="53" height="6" fill="currentColor" fill-opacity="0.65" />
		<rect x="4" y="22" width="40" height="6" fill="currentColor" />
	{:else if chartType === 'bar-stacked'}
		<path d="M4 3V29" opacity="0.2" />
		<rect x="4" y="4" width="21" height="6" fill="currentColor" fill-opacity="0.35" />
		<rect x="25" y="4" width="17" height="6" fill="currentColor" fill-opacity="0.85" />
		<rect x="4" y="13" width="34" height="6" fill="currentColor" fill-opacity="0.35" />
		<rect x="38" y="13" width="20" height="6" fill="currentColor" fill-opacity="0.85" />
		<rect x="4" y="22" width="16" height="6" fill="currentColor" fill-opacity="0.35" />
		<rect x="20" y="22" width="28" height="6" fill="currentColor" fill-opacity="0.85" />
	{:else if chartType === 'bar-grouped'}
		<path d="M4 2V30" opacity="0.2" />
		<rect x="4" y="3" width="26" height="4" fill="currentColor" fill-opacity="0.35" />
		<rect x="4" y="8" width="40" height="4" fill="currentColor" fill-opacity="0.85" />
		<rect x="4" y="14" width="48" height="4" fill="currentColor" fill-opacity="0.35" />
		<rect x="4" y="19" width="33" height="4" fill="currentColor" fill-opacity="0.85" />
		<rect x="4" y="25" width="20" height="4" fill="currentColor" fill-opacity="0.35" />
		<rect x="4" y="30" width="31" height="1" fill="currentColor" fill-opacity="0.85" />
	{:else if chartType === 'waterfall'}
		<path d="M3 29H61" opacity="0.2" />
		<rect x="4" y="16" width="10" height="13" fill="currentColor" fill-opacity="0.7" />
		<path d="M14 16H20" opacity="0.45" />
		<rect x="20" y="8" width="10" height="8" fill="currentColor" fill-opacity="0.35" />
		<path d="M30 8H36" opacity="0.45" />
		<rect x="36" y="8" width="10" height="11" fill="currentColor" fill-opacity="0.35" />
		<path d="M46 19H52" opacity="0.45" />
		<rect x="52" y="19" width="9" height="10" fill="currentColor" />
	{:else if chartType === 'waterfall-horizontal'}
		<path d="M4 2V30" opacity="0.2" />
		<rect x="4" y="3" width="18" height="5" fill="currentColor" fill-opacity="0.7" />
		<path d="M22 8V11" opacity="0.45" />
		<rect x="22" y="11" width="20" height="5" fill="currentColor" fill-opacity="0.35" />
		<path d="M42 16V19" opacity="0.45" />
		<rect x="32" y="19" width="10" height="5" fill="currentColor" fill-opacity="0.35" />
		<path d="M32 24V27" opacity="0.45" />
		<rect x="4" y="27" width="28" height="4" fill="currentColor" />
	{:else if chartType === 'map'}
		<path
			d="M5 7L19 3L32 8L47 4L59 8V25L47 29L32 24L19 29L5 25Z"
			fill="currentColor"
			fill-opacity="0.08"
		/>
		<path d="M19 3V29M32 8V24M47 4V29" opacity="0.3" />
		<circle cx="22" cy="17" r="2.5" fill="currentColor" stroke="white" />
		<circle cx="43" cy="11" r="4" fill="currentColor" fill-opacity="0.75" stroke="white" />
		<circle cx="50" cy="22" r="2" fill="currentColor" stroke="white" />
	{/if}
</svg>
