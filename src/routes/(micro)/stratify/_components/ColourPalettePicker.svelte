<script>
	import { getStratifyContext } from '../_state/context.js';
	import { PALETTES, getPaletteColours } from '$lib/stratify/colour-palettes.js';

	const project = getStratifyContext();

	/** @type {import('$lib/stratify/colour-palettes.js').PaletteType} */
	let activeType = $state('qualitative');

	const CLASS_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
	let classCount = $state(8);

	let filteredPalettes = $derived(PALETTES.filter((p) => p.type === activeType));

	/** @param {string} paletteId */
	function selectPalette(paletteId) {
		project.colourPalette = paletteId;
		project.userSeriesColours = {};
	}
</script>

<div class="flex flex-col gap-3">
	<!-- Type selector -->
	<div class="flex gap-1">
		{#each /** @type {const} */ (['qualitative', 'sequential', 'diverging']) as type}
			<button
				type="button"
				class="px-2 py-0.5 text-[10px] rounded border transition-colors {activeType === type
					? 'border-dark-grey text-dark-grey bg-white'
					: 'border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey'}"
				onclick={() => (activeType = type)}
			>
				{type.charAt(0).toUpperCase() + type.slice(1)}
			</button>
		{/each}
	</div>

	<!-- Class count (for sequential/diverging) -->
	{#if activeType !== 'qualitative'}
		<div class="flex items-center gap-1.5">
			<span class="text-[10px] text-mid-grey">Classes:</span>
			<div class="flex gap-0.5">
				{#each CLASS_COUNTS as n}
					<button
						type="button"
						class="w-5 h-5 text-[9px] rounded transition-colors {classCount === n
							? 'bg-dark-grey text-white'
							: 'bg-warm-grey/50 text-mid-grey hover:bg-warm-grey'}"
						onclick={() => (classCount = n)}
					>
						{n}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Palette list -->
	<div class="flex flex-col gap-1">
		{#each filteredPalettes as palette (palette.id)}
			{@const colours = getPaletteColours(
				palette.id,
				activeType === 'qualitative'
					? typeof palette.colours === 'function'
						? 8
						: palette.colours.length
					: classCount
			)}
			{@const isSelected = project.colourPalette === palette.id}
			<button
				type="button"
				class="flex items-center justify-between px-2 py-1.5 rounded border text-left transition-colors w-full {isSelected
					? 'border-dark-grey bg-white'
					: 'border-warm-grey hover:border-mid-warm-grey'}"
				onclick={() => selectPalette(palette.id)}
			>
				<div class="flex gap-0.5 flex-shrink-0">
					{#each colours.slice(0, 12) as colour}
						<span
							class="block w-3 h-3 rounded-sm"
							style="background: {colour};"
						></span>
					{/each}
				</div>
				<span class="text-[10px] text-mid-grey truncate">{palette.name}</span>
			</button>
		{/each}
	</div>
</div>
