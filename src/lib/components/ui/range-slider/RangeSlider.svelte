<script>
	import { Slider } from 'bits-ui';

	/**
	 * @type {{
	 *   min?: number,
	 *   max?: number,
	 *   value?: [number, number],
	 *   step?: number,
	 *   onchange?: (value: [number, number]) => void,
	 *   formatValue?: (value: number) => string,
	 *   ghostRange?: [number, number] | null,
	 *   playheadPosition?: number | null
	 * }}
	 */
	let {
		min = 0,
		max = 100,
		value = [0, 100],
		step = 1,
		onchange,
		formatValue = (v) => String(v),
		ghostRange = null,
		playheadPosition = null
	} = $props();

	// Local state for immediate UI feedback
	let localValue = $state(/** @type {number[]} */ ([...value]));

	// Sync local state when props change
	$effect(() => {
		localValue = [...value];
	});

	/**
	 * Handle value change during drag
	 * @param {number[]} newValue
	 */
	function handleValueChange(newValue) {
		localValue = newValue;
	}

	/**
	 * Handle value commit (on drag end)
	 * @param {number[]} newValue
	 */
	function handleValueCommit(newValue) {
		onchange?.(/** @type {[number, number]} */ (newValue));
	}

	/**
	 * Parse formatted value into number and unit parts
	 * @param {string} formatted
	 * @returns {{ number: string, unit: string }}
	 */
	function parseFormattedValue(formatted) {
		const match = formatted.match(/^([\d.,]+)\s*(.*)$/);
		if (match) {
			return { number: match[1], unit: match[2] };
		}
		return { number: formatted, unit: '' };
	}

	let displayMin = $derived(parseFormattedValue(formatValue(localValue[0] ?? min)));
	let displayMax = $derived(parseFormattedValue(formatValue(localValue[1] ?? max)));

	// Ghost range positioning (percentage-based)
	let ghostLeft = $derived(
		ghostRange ? ((ghostRange[0] - min) / (max - min)) * 100 : 0
	);
	let ghostWidth = $derived(
		ghostRange ? ((ghostRange[1] - ghostRange[0]) / (max - min)) * 100 : 0
	);

	// Playhead positioning (percentage-based)
	let playheadLeft = $derived(
		playheadPosition != null ? ((playheadPosition - min) / (max - min)) * 100 : 0
	);

	let isPlaying = $derived(playheadPosition != null);
	let playheadDisplayValue = $derived(
		playheadPosition != null ? parseFormattedValue(formatValue(playheadPosition)) : null
	);
</script>

<div class="flex flex-col gap-2 w-full">
	<!-- Value display -->
	<div class="flex items-center justify-between">
		<span class="flex items-baseline gap-1">
			<span class="font-mono text-sm text-dark-grey">{displayMin.number}</span>
			<span class="text-xs text-mid-grey">{displayMin.unit}</span>
		</span>
		{#if playheadDisplayValue}
			<span class="flex items-baseline gap-1">
				<span class="font-mono text-sm font-semibold text-dark-grey">{playheadDisplayValue.number}</span>
				<span class="text-xs text-mid-grey">{playheadDisplayValue.unit}</span>
			</span>
		{/if}
		<span class="flex items-baseline gap-1">
			<span class="font-mono text-sm text-dark-grey">{displayMax.number}</span>
			<span class="text-xs text-mid-grey">{displayMax.unit}</span>
		</span>
	</div>

	{#if isPlaying}
		<!-- Scrubber mode: simple progress bar with thumb -->
		<div class="relative flex w-full items-center h-4">
			<!-- Track -->
			<span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-warm-grey">
				<!-- Filled region up to playhead -->
				<span
					class="absolute h-full bg-dark-grey"
					style="left: 0; width: {playheadLeft}%"
				></span>
			</span>

			<!-- Scrubber thumb -->
			<span
				class="absolute block size-4 rounded-full border-2 border-dark-grey bg-white shadow-sm pointer-events-none"
				style="left: {playheadLeft}%; translate: -50% 0"
			></span>
		</div>
	{:else}
		<!-- Range slider mode -->
		<Slider.Root
			type="multiple"
			{min}
			{max}
			{step}
			value={localValue}
			onValueChange={handleValueChange}
			onValueCommit={handleValueCommit}
			class="relative flex w-full touch-none select-none items-center"
		>
			{#snippet children({ thumbItems })}
				<!-- Track -->
				<span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-warm-grey">
					{#if ghostRange}
						<!-- Ghost range bar -->
						<span
							class="absolute h-full bg-mid-warm-grey"
							style="left: {ghostLeft}%; width: {ghostWidth}%"
						></span>
					{/if}

					<!-- Range (filled area between thumbs) -->
					<Slider.Range class="absolute h-full bg-dark-grey" />
				</span>

				{#if ghostRange}
					<!-- Ghost markers at ghost range endpoints -->
					<span
						class="absolute size-2 rounded-full bg-mid-warm-grey pointer-events-none"
						style="left: {ghostLeft}%; translate: -50% 0"
					></span>
					<span
						class="absolute size-2 rounded-full bg-mid-warm-grey pointer-events-none"
						style="left: {ghostLeft + ghostWidth}%; translate: -50% 0"
					></span>
				{/if}

				<!-- Thumbs -->
				{#each thumbItems as { index } (index)}
					<Slider.Thumb
						{index}
						class="block size-4 rounded-full border-2 border-dark-grey bg-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-grey focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing"
					/>
				{/each}
			{/snippet}
		</Slider.Root>
	{/if}
</div>
