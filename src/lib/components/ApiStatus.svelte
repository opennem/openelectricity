<script>
	import { onMount } from 'svelte';
	import { API_STATUS_URL, fetchApiStatus } from '$lib/api-status.js';

	/**
	 * ApiStatus — a link to the status page with a coloured dot for the current
	 * API status. Renders nothing until the summary loads (or if it fails).
	 *
	 * `variant="compact"` is the small inline form used in the fullscreen footer.
	 *
	 * @type {{ variant?: 'default' | 'compact' }}
	 */
	let { variant = 'default' } = $props();

	/** @type {import('$lib/api-status.js').ApiStatusSummary | null} */
	let summary = $state(null);
	let hover = $state(false);

	function toggleHover() {
		hover = !hover;
	}

	onMount(async () => {
		summary = await fetchApiStatus();
	});
</script>

{#if summary}
	{#if variant === 'compact'}
		<a
			href={API_STATUS_URL}
			target="_blank"
			rel="noopener noreferrer"
			title="API status: {summary.statusLabel}"
			class="flex items-center gap-1.5 text-mid-grey no-underline hover:text-red hover:no-underline"
		>
			<span
				class="inline-block size-2.5 shrink-0 rounded-full"
				style="background-color: {summary.statusColor}"
			></span>
			API Status
		</a>
	{:else}
		<a
			href={API_STATUS_URL}
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
{/if}
