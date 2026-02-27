<script>
	import { onMount } from 'svelte';

	/**
	 * @typedef {Object} StatusSummary
	 * @property {string} status
	 * @property {number} apiLatencyMs
	 * @property {number} dataLatencyMs
	 * @property {string} checkedAt
	 * @property {string} statusColor
	 * @property {string} statusLabel
	 */

	/** @type {StatusSummary | null} */
	let summary = $state(null);
	let hover = $state(false);

	function toggleHover() {
		hover = !hover;
	}

	onMount(async () => {
		try {
			const res = await fetch('https://status.openelectricity.org.au/api/summary');
			if (res.ok) {
				summary = await res.json();
			}
		} catch {
			// Silently fail — component renders nothing on error
		}
	});
</script>

{#if summary}
	<a
		href="https://status.openelectricity.org.au"
		target="_blank"
		rel="noopener noreferrer"
		class="flex items-center gap-3 font-bold font-space transition-all text-dark-grey hover:text-red hover:no-underline"
		onmouseenter={toggleHover}
		onmouseleave={toggleHover}
	>
		<span
			class="inline-block size-2.5 shrink-0 rounded-full"
			style="background-color: {summary.statusColor}"
		></span>
		API Status
		<svg
			class="transition-all"
			class:translate-x-1={hover}
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="10"
				cy="10"
				r="9.5"
				fill="white"
				class={`transition-all ${hover ? 'stroke-red' : 'stroke-black'}`}
			/>
			<path
				d="M7.99854 14L12.3319 9.66671L7.99854 5.33337"
				stroke-width="1.5"
				class={`transition-all ${hover ? 'stroke-red' : 'stroke-black'}`}
			/>
		</svg>
	</a>
{/if}
