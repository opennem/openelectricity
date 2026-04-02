<script>
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { getStratifyContext } from '../_state/context.js';
	import { getPaletteColours } from '$lib/stratify/colour-palettes.js';

	const project = getStratifyContext();

	const FLIP_DURATION = 150;

	/** @type {Array<{id: string, name: string}>} */
	let dndItems = $state([]);

	// Sync ordered series names → dndItems when source data changes.
	// Intentionally using $effect (not $derived) because dndItems is also
	// mutated by the DnD library during drag operations — $derived would
	// overwrite the library's intermediate states and break the interaction.
	$effect(() => {
		const ordered = project.orderedSeriesNames;
		dndItems = ordered.map((name) => ({ id: name, name }));
	});

	/** @param {CustomEvent} e */
	function handleDndConsider(e) {
		dndItems = e.detail.items;
	}

	/** @param {CustomEvent} e */
	function handleDndFinalize(e) {
		dndItems = e.detail.items;
		project.seriesOrder = dndItems.map((item) => item.name);
	}

	/** @type {string | null} */
	let openPickerKey = $state(null);

	/** @type {string} */
	let colourInput = $state('');

	/**
	 * Open the colour picker for a series
	 * @param {string} key
	 */
	function openPicker(key) {
		if (openPickerKey === key) {
			openPickerKey = null;
			return;
		}
		openPickerKey = key;
		colourInput = project.seriesColours[key] || '';
	}

	/**
	 * Set colour for the open series
	 * @param {string} colour
	 */
	function setColour(colour) {
		if (!openPickerKey) return;
		project.userSeriesColours = { ...project.userSeriesColours, [openPickerKey]: colour };
		colourInput = colour;
	}

	/**
	 * Handle text input for hex/rgba colour
	 * @param {string} value
	 */
	function handleColourInput(value) {
		colourInput = value;
		const trimmed = value.trim();
		// Accept hex (#xxx, #xxxxxx, #xxxxxxxx) or rgba(...)
		if (
			/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed) ||
			/^rgba?\(/.test(trimmed)
		) {
			if (openPickerKey) {
				project.userSeriesColours = {
					...project.userSeriesColours,
					[openPickerKey]: trimmed
				};
			}
		}
	}

	/**
	 * Reset colour override for a series
	 * @param {string} key
	 */
	function resetColour(key) {
		const { [key]: _, ...rest } = project.userSeriesColours;
		project.userSeriesColours = rest;
		// Update input to show the preset colour
		colourInput = project.seriesColours[key] || '';
	}

	/**
	 * Toggle series visibility
	 * @param {string} key
	 */
	function toggleVisibility(key) {
		if (project.hiddenSeries.includes(key)) {
			project.hiddenSeries = project.hiddenSeries.filter((k) => k !== key);
		} else {
			project.hiddenSeries = [...project.hiddenSeries, key];
		}
	}

	/**
	 * Update label for a series
	 * @param {string} key
	 * @param {string} label
	 */
	function updateLabel(key, label) {
		project.userSeriesLabels = { ...project.userSeriesLabels, [key]: label };
	}

	/**
	 * Update Y-axis assignment for a series
	 * @param {string} key
	 * @param {string} value
	 */
	function updateSeriesYAxis(key, value) {
		if (value === 'left') {
			if (!(key in project.seriesYAxis)) return;
			const { [key]: _, ...rest } = project.seriesYAxis;
			project.seriesYAxis = rest;
		} else {
			if (project.seriesYAxis[key] === value) return;
			project.seriesYAxis = {
				...project.seriesYAxis,
				[key]: /** @type {'left' | 'right'} */ (value)
			};
		}
	}


	/**
	 * Update chart type override for a right-axis series
	 * @param {string} key
	 * @param {string} value
	 */
	function updateSeriesChartType(key, value) {
		if (value === '') {
			const { [key]: _, ...rest } = project.seriesChartTypes;
			project.seriesChartTypes = rest;
		} else {
			project.seriesChartTypes = { ...project.seriesChartTypes, [key]: value };
		}
	}

	/**
	 * Close picker when clicking outside
	 * @param {MouseEvent} e
	 */
	function handleClickOutside(e) {
		const target = /** @type {HTMLElement} */ (e.target);
		if (openPickerKey && !target.closest('.colour-picker-area')) {
			openPickerKey = null;
		}
	}
</script>

<svelte:document onclick={handleClickOutside} />

{#if project.hasColourSeries}
	<!-- Colour group mode: show group values with swatches -->
	<div>
		<span class="block text-[10px] text-mid-grey uppercase tracking-wide mb-2">Colour groups</span>

		<div class="space-y-1.5">
			{#each project.colourGroupNames as group (group)}
				{@const hasOverride = group in project.userSeriesColours}

				<div class="colour-picker-area">
					<div class="flex items-center gap-1.5">
						<!-- Colour swatch -->
						<button
							type="button"
							onclick={() => openPicker(group)}
							class="w-4 h-4 rounded-sm shrink-0 border {openPickerKey === group
								? 'border-dark-grey ring-1 ring-dark-grey/20'
								: 'border-mid-warm-grey'}"
							style="background-color: {project.seriesColours[group] || '#ccc'};"
							title="Pick colour"
						></button>

						<!-- Label input -->
						<input
							type="text"
							value={project.seriesLabels[group] || group}
							oninput={(e) => updateLabel(group, e.currentTarget.value)}
							class="bg-transparent border border-transparent rounded px-1.5 py-0.5 text-[11px] flex-1 min-w-0 focus:outline-none focus:border-warm-grey focus:bg-light-warm-grey/50"
						/>
					</div>

					<!-- Colour picker popover -->
					{#if openPickerKey === group}
						<div class="mt-1.5 ml-0.5 p-2.5 bg-white border border-warm-grey rounded-lg shadow-md">
							<!-- Preset palette swatches -->
							<div class="flex flex-wrap gap-1 mb-2">
								{#each getPaletteColours(project.colourPalette, 12) as colour, i (colour + i)}
									<button
										type="button"
										onclick={() => setColour(colour)}
										class="w-5 h-5 rounded-sm border {project.seriesColours[group] === colour
											? 'border-dark-grey ring-1 ring-dark-grey/30'
											: 'border-mid-warm-grey/50 hover:border-mid-warm-grey'}"
										style="background-color: {colour};"
										title={colour}
									></button>
								{/each}
							</div>

							<!-- Native colour picker + hex input -->
							<div class="flex items-center gap-1.5">
								<input
									type="color"
									value={project.seriesColours[group]?.startsWith('#')
										? project.seriesColours[group].slice(0, 7)
										: '#000000'}
									oninput={(e) => setColour(e.currentTarget.value)}
									class="w-6 h-6 rounded border border-warm-grey cursor-pointer p-0"
									title="Colour picker"
								/>
								<input
									type="text"
									value={colourInput}
									oninput={(e) => handleColourInput(e.currentTarget.value)}
									placeholder="#hex or rgba(...)"
									class="flex-1 min-w-0 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-dark-grey"
								/>
								{#if hasOverride}
									<button
										type="button"
										onclick={() => resetColour(group)}
										class="text-[10px] text-mid-grey hover:text-dark-grey shrink-0"
										title="Reset to preset colour"
									>
										Reset
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{:else if project.parsedData.seriesNames.length > 0}
	<div>
		<span class="block text-[10px] text-mid-grey uppercase tracking-wide mb-2">Series</span>

		<div
			class="space-y-1.5"
			use:dndzone={{ items: dndItems, flipDurationMs: FLIP_DURATION, type: 'series' }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
		>
			{#each dndItems as item (item.id)}
				{@const key = item.name}
				{@const isHidden = project.hiddenSeries.includes(key)}
				{@const hasOverride = key in project.userSeriesColours}

				<div class="colour-picker-area" animate:flip={{ duration: FLIP_DURATION }}>
					<div class="flex items-center gap-1.5">
						<!-- Drag handle -->
						<div
							class="shrink-0 cursor-grab active:cursor-grabbing text-mid-warm-grey hover:text-mid-grey"
							title="Drag to reorder"
						>
							<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
								<circle cx="3" cy="3" r="1.2" />
								<circle cx="7" cy="3" r="1.2" />
								<circle cx="3" cy="7" r="1.2" />
								<circle cx="7" cy="7" r="1.2" />
								<circle cx="3" cy="11" r="1.2" />
								<circle cx="7" cy="11" r="1.2" />
							</svg>
						</div>

						<!-- Colour swatch -->
						<button
							type="button"
							onclick={() => openPicker(key)}
							class="w-4 h-4 rounded-sm shrink-0 border {openPickerKey === key
								? 'border-dark-grey ring-1 ring-dark-grey/20'
								: 'border-mid-warm-grey'}"
							style="background-color: {project.seriesColours[key] || '#ccc'};"
							title="Pick colour"
						></button>

						<!-- Label input -->
						<input
							type="text"
							value={project.seriesLabels[key] || key}
							oninput={(e) => updateLabel(key, e.currentTarget.value)}
							class="bg-transparent border border-transparent rounded px-1.5 py-0.5 text-[11px] flex-1 min-w-0 focus:outline-none focus:border-warm-grey focus:bg-light-warm-grey/50"
						/>

						<!-- Y-axis toggle -->
						<select
							value={project.seriesYAxis[key] || 'left'}
							onchange={(e) => updateSeriesYAxis(key, e.currentTarget.value)}
							class="text-[10px] bg-transparent border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-warm-grey text-mid-grey cursor-pointer w-8 shrink-0"
							title="Y-axis for this series"
						>
							<option value="left">L</option>
							<option value="right">R</option>
						</select>

						<!-- Chart type override (right-axis only) -->
						{#if project.seriesYAxis[key] === 'right'}
							<select
								value={project.seriesChartTypes[key] || ''}
								onchange={(e) => updateSeriesChartType(key, e.currentTarget.value)}
								class="text-[10px] bg-transparent border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-warm-grey text-mid-grey cursor-pointer w-16 shrink-0"
								title="Chart type for this series"
							>
								<option value="">Default</option>
								<option value="line">Line</option>
								<option value="column">Column</option>
								<option value="area">Area</option>
							</select>
						{/if}

						<!-- Visibility toggle -->
						<button
							type="button"
							onclick={() => toggleVisibility(key)}
							class="text-[10px] px-1.5 py-0.5 rounded shrink-0 {isHidden
								? 'text-mid-warm-grey line-through'
								: 'text-mid-grey hover:text-dark-grey'}"
							title={isHidden ? 'Show series' : 'Hide series'}
						>
							{isHidden ? 'Hidden' : 'Visible'}
						</button>
					</div>

					<!-- Colour picker popover -->
					{#if openPickerKey === key}
						<div class="mt-1.5 ml-5.5 p-2.5 bg-white border border-warm-grey rounded-lg shadow-md">
							<!-- Preset palette swatches -->
							<div class="flex flex-wrap gap-1 mb-2">
								{#each getPaletteColours(project.colourPalette, 12) as colour, i (colour + i)}
									<button
										type="button"
										onclick={() => setColour(colour)}
										class="w-5 h-5 rounded-sm border {project.seriesColours[key] === colour
											? 'border-dark-grey ring-1 ring-dark-grey/30'
											: 'border-mid-warm-grey/50 hover:border-mid-warm-grey'}"
										style="background-color: {colour};"
										title={colour}
									></button>
								{/each}
							</div>

							<!-- Native colour picker + hex input -->
							<div class="flex items-center gap-1.5">
								<input
									type="color"
									value={project.seriesColours[key]?.startsWith('#')
										? project.seriesColours[key].slice(0, 7)
										: '#000000'}
									oninput={(e) => setColour(e.currentTarget.value)}
									class="w-6 h-6 rounded border border-warm-grey cursor-pointer p-0"
									title="Colour picker"
								/>
								<input
									type="text"
									value={colourInput}
									oninput={(e) => handleColourInput(e.currentTarget.value)}
									placeholder="#hex or rgba(...)"
									class="flex-1 min-w-0 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-dark-grey"
								/>
								{#if hasOverride}
									<button
										type="button"
										onclick={() => resetColour(key)}
										class="text-[10px] text-mid-grey hover:text-dark-grey shrink-0"
										title="Reset to preset colour"
									>
										Reset
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
