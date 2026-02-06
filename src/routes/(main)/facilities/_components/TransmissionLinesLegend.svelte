<script>
	import { Info } from '@lucide/svelte';

	/**
	 * @typedef {{ high: boolean, medium: boolean, low: boolean, lowest: boolean }} Visibility
	 */

	/**
	 * @type {{
	 *   satelliteView?: boolean,
	 *   visibility?: Visibility,
	 *   onvisibilitychange?: (visibility: Visibility) => void
	 * }}
	 */
	let {
		satelliteView = false,
		visibility = { high: true, medium: true, low: true, lowest: true },
		onvisibilitychange
	} = $props();

	/**
	 * @param {MouseEvent} e
	 */
	function handleInfoClick(e) {
		e.stopPropagation();
	}

	/**
	 * @param {'high' | 'medium' | 'low' | 'lowest'} level
	 */
	function toggleLevel(level) {
		onvisibilitychange?.({ ...visibility, [level]: !visibility[level] });
	}
</script>

<div
	class="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-xs"
>
	<div class="flex items-center gap-3">
		<button
			onclick={() => toggleLevel('high')}
			class="flex items-center gap-1.5 cursor-pointer transition-opacity"
			class:opacity-30={!visibility.high}
		>
			<span
				class="w-5 h-1 rounded-full"
				style="background-color: {satelliteView ? '#ff6b6b' : '#c0392b'};"
			></span>
			<span class="text-mid-grey">400-500 kV</span>
		</button>
		<button
			onclick={() => toggleLevel('medium')}
			class="flex items-center gap-1.5 cursor-pointer transition-opacity"
			class:opacity-30={!visibility.medium}
		>
			<span
				class="w-5 h-1 rounded-full"
				style="background-color: {satelliteView ? '#ffd93d' : '#c49b00'};"
			></span>
			<span class="text-mid-grey">220-330 kV</span>
		</button>
		<button
			onclick={() => toggleLevel('low')}
			class="flex items-center gap-1.5 cursor-pointer transition-opacity"
			class:opacity-30={!visibility.low}
		>
			<span
				class="w-5 h-1 rounded-full"
				style="background-color: {satelliteView ? '#6bcb77' : '#27ae60'};"
			></span>
			<span class="text-mid-grey">110-132 kV</span>
		</button>
		<button
			onclick={() => toggleLevel('lowest')}
			class="flex items-center gap-1.5 cursor-pointer transition-opacity"
			class:opacity-30={!visibility.lowest}
		>
			<span
				class="w-5 h-1 rounded-full"
				style="background-color: {satelliteView ? '#74b9ff' : '#2980b9'};"
			></span>
			<span class="text-mid-grey">&lt; 110 kV</span>
		</button>
		<a
			href="https://digital.atlas.gov.au/datasets/digitalatlas::electricity-transmission-lines/about"
			target="_blank"
			rel="noopener noreferrer"
			title="Source: Digital Atlas of Australia"
			class="text-mid-grey/50 hover:text-mid-grey"
			onclick={handleInfoClick}
		>
			<Info class="size-4" />
		</a>
	</div>
</div>
