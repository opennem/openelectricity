<script>
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { getStratifyContext } from '../_state/context.js';
	import ColourPicker from './ColourPicker.svelte';
	import { LINE_STYLES, WATERFALL_ROLE_KEYS } from '$lib/stratify/chart-types.js';

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

	/**
	 * Set a colour override for a series / group / role.
	 * @param {string} key
	 * @param {string} colour
	 */
	function setColour(key, colour) {
		project.userSeriesColours = { ...project.userSeriesColours, [key]: colour };
	}

	/**
	 * Reset colour override for a series / group / role.
	 * @param {string} key
	 */
	function resetColour(key) {
		const { [key]: _, ...rest } = project.userSeriesColours;
		project.userSeriesColours = rest;
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
	 * Whether a series will render as a line.
	 * @param {string} key
	 * @returns {boolean}
	 */
	function isLineSeries(key) {
		const override = project.seriesChartTypes[key];
		if (override) return override === 'line';
		return project.chartType === 'line';
	}

	/**
	 * Update line style for a series
	 * @param {string} key
	 * @param {string} value
	 */
	function updateSeriesLineStyle(key, value) {
		if (value === '' || value === 'solid') {
			const { [key]: _, ...rest } = project.seriesLineStyles;
			project.seriesLineStyles = rest;
		} else {
			project.seriesLineStyles = { ...project.seriesLineStyles, [key]: value };
		}
	}
</script>

{#if project.hasColourSeries || project.isMapCategory || project.isWaterfallPerRow || project.isWaterfallSemantic}
	{@const groupNames = project.isMapCategory
		? project.mapColourGroupNames
		: project.isWaterfallSemantic
			? WATERFALL_ROLE_KEYS
			: project.isWaterfallPerRow
				? project.waterfallRowNames
				: project.colourGroupNames}
	<!-- Colour group / per-row / semantic mode: show each value with a colour swatch -->
	<div>
		<span class="block text-[10px] text-mid-grey uppercase tracking-wide mb-2"
			>{project.isWaterfallSemantic
				? 'Waterfall colours'
				: project.isWaterfallPerRow
					? 'Bar colours'
					: 'Colour groups'}</span
		>

		<div class="space-y-1.5">
			{#each groupNames as group (group)}
				<div class="flex items-center gap-1.5">
					<ColourPicker
						value={project.seriesColours[group]}
						onChange={(c) => setColour(group, c)}
						hasOverride={group in project.userSeriesColours}
						onReset={() => resetColour(group)}
					/>

					<!-- Label input -->
					<input
						type="text"
						value={project.seriesLabels[group] || group}
						oninput={(e) => updateLabel(group, e.currentTarget.value)}
						class="bg-transparent border border-transparent rounded px-1.5 py-0.5 text-[11px] flex-1 min-w-0 focus:outline-none focus:border-warm-grey focus:bg-light-warm-grey/50"
					/>
				</div>
			{/each}
		</div>
	</div>
{:else if project.parsedData.seriesNames.length > 0 && project.chartType !== 'map'}
	<div>
		<div
			class="space-y-1.5"
			use:dndzone={{ items: dndItems, flipDurationMs: FLIP_DURATION, type: 'series' }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
		>
			{#each dndItems as item (item.id)}
				{@const key = item.name}
				{@const isHidden = project.hiddenSeries.includes(key)}

				<div animate:flip={{ duration: FLIP_DURATION }}>
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

						<ColourPicker
							value={project.seriesColours[key]}
							onChange={(c) => setColour(key, c)}
							hasOverride={key in project.userSeriesColours}
							onReset={() => resetColour(key)}
						/>

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
							class="text-[10px] bg-light-warm-grey/50 border border-warm-grey rounded pl-1 pr-8 py-0.5 focus:outline-none focus:border-dark-grey text-mid-grey cursor-pointer shrink-0"
							title="Y-axis for this series"
						>
							<option value="left">Left</option>
							<option value="right">Right</option>
						</select>

						<!-- Line style (line series only) -->
						{#if isLineSeries(key)}
							<select
								value={project.seriesLineStyles[key] || 'solid'}
								onchange={(e) => updateSeriesLineStyle(key, e.currentTarget.value)}
								class="text-[10px] bg-light-warm-grey/50 border border-warm-grey rounded pl-1 pr-8 py-0.5 focus:outline-none focus:border-dark-grey text-mid-grey cursor-pointer shrink-0"
								title="Line style for this series"
							>
								{#each LINE_STYLES as style (style.value)}
									<option value={style.value}>{style.label}</option>
								{/each}
							</select>
						{/if}

						<!-- Chart type override (right-axis only) -->
						{#if project.seriesYAxis[key] === 'right'}
							<select
								value={project.seriesChartTypes[key] || ''}
								onchange={(e) => updateSeriesChartType(key, e.currentTarget.value)}
								class="text-[10px] bg-light-warm-grey/50 border border-warm-grey rounded pl-1 pr-8 py-0.5 focus:outline-none focus:border-dark-grey text-mid-grey cursor-pointer shrink-0"
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
							class="text-[10px] px-2 py-0.5 rounded border shrink-0 transition-colors {isHidden
								? 'border-warm-grey text-mid-warm-grey bg-light-warm-grey/50'
								: 'border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey'}"
							title={isHidden ? 'Show series' : 'Hide series'}
						>
							{isHidden ? 'Show' : 'Hide'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
