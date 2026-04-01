<script>
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import Switch from '$lib/components/Switch.svelte';
	import ChartTypeSelector from '../ChartTypeSelector.svelte';
	import StylePresetPicker from '../StylePresetPicker.svelte';
	import { getStratifyContext } from '../../_state/context.js';

	const project = getStratifyContext();
	const FLIP_DURATION = 150;

	/** @type {Array<{id: string, key: string, label: string}>} */
	let tooltipDndItems = $state([]);

	$effect(() => {
		const all = project.allColumns;
		const ordered =
			project.tooltipColumns.length > 0
				? [
						...project.tooltipColumns
							.map((key) => all.find((c) => c.key === key))
							.filter(Boolean),
						...all.filter((c) => !project.tooltipColumns.includes(c.key))
					]
				: all;
		tooltipDndItems = ordered.map((col) => ({
			id: col.key,
			key: col.key,
			label: col === all[0] && !project.isCategory ? 'Date' : col.label
		}));
	});

	/** @param {CustomEvent} e */
	function handleTooltipConsider(e) {
		tooltipDndItems = e.detail.items;
	}

	/** @param {CustomEvent} e */
	function handleTooltipFinalize(e) {
		tooltipDndItems = e.detail.items;
		const selected = project.tooltipColumns.length > 0
			? new Set(project.tooltipColumns)
			: new Set(project.allColumns.map((c) => c.key));
		project.tooltipColumns = tooltipDndItems.filter((item) => selected.has(item.key)).map((item) => item.key);
	}

	const modeButtons = [
		{ label: 'Auto', value: 'auto' },
		{ label: 'Dates', value: 'time-series' },
		{ label: 'Categories', value: 'category' }
	];

	// --- Column mapping derived values ---
	// Raw column headers from CSV (before any xColumn rearrangement)
	let rawColumns = $derived.by(() => {
		const text = project.csvText?.trim();
		if (!text) return [];
		const firstLine = text.split('\n')[0] ?? '';
		const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : ';';
		return firstLine
			.split(delim)
			.map((/** @type {string} */ h) => {
				const label = h.trim().replace(/^["']|["']$/g, '');
				const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
				return { key, label };
			});
	});

	let xColumnLabel = $derived(project.allColumns[0]?.label ?? '');
	let nonFirstColumns = $derived(project.allColumns.slice(1));
	let yColumnLabels = $derived(
		project.allColumns
			.slice(1)
			.filter((col) => col.isNumeric && col.key !== project.colourSeries)
			.map((col) => col.label)
			.join(', ')
	);

	let showAdvanced = $state(false);
	let overridesText = $state('');
	let parseError = $state('');

	$effect(() => {
		if (showAdvanced) {
			overridesText = project.plotOverrides ? JSON.stringify(project.plotOverrides, null, 2) : '';
			parseError = '';
		}
	});

	/** @param {string} value */
	function handleModeChange(value) {
		project.displayMode = /** @type {'auto' | 'time-series' | 'category'} */ (value);
	}

	/** @param {string} value */
	function handleOverridesInput(value) {
		overridesText = value;

		if (!value.trim()) {
			project.plotOverrides = null;
			parseError = '';
			return;
		}

		try {
			project.plotOverrides = JSON.parse(value);
			parseError = '';
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Invalid JSON';
		}
	}
</script>

<div class="flex flex-col gap-3">
	<div>
		<span class="block text-[10px] text-mid-grey uppercase tracking-wide mb-2">Data mode</span>
		<Switch buttons={modeButtons} selected={project.displayMode} onChange={handleModeChange} />
	</div>

	<ChartTypeSelector />
</div>

{#if project.hasData}
	<div class="mt-3 pt-3 border-t border-warm-grey">
		<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Column mapping</p>

		<div class="flex flex-col gap-2">
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-14 shrink-0">X axis</span>
				<select
					value={project.xColumn || rawColumns[0]?.key || ''}
					onchange={(e) => {
						const val = e.currentTarget.value;
						project.xColumn = val === rawColumns[0]?.key ? '' : val;
					}}
					class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
				>
					{#each rawColumns as col (col.key)}
						<option value={col.key}>{col.label}</option>
					{/each}
				</select>
			</label>

		{@const visibleYColumns = nonFirstColumns.filter((c) => !project.hiddenSeries.includes(c.key))}
			{@const selectedY = visibleYColumns.length === 1 ? visibleYColumns[0]?.key : ''}
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-14 shrink-0">Y value</span>
				<select
					value={selectedY}
					onchange={(e) => {
						const val = e.currentTarget.value;
						if (val) {
							// Hide all other series, show only selected
							project.hiddenSeries = nonFirstColumns
								.filter((c) => c.key !== val)
								.map((c) => c.key);
						} else {
							// Show all
							project.hiddenSeries = [];
						}
					}}
					class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
				>
					<option value="">All columns</option>
					{#each nonFirstColumns as col (col.key)}
						<option value={col.key}>{col.label}</option>
					{/each}
				</select>
			</label>

			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-14 shrink-0">Z (colour)</span>
				<select
					value={project.colourSeries ?? ''}
					onchange={(e) => {
						const val = e.currentTarget.value;
						project.colourSeries = val || null;
						project.userSeriesColours = {};
						project.userSeriesLabels = {};
					}}
					class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
				>
					<option value="">None</option>
					{#each nonFirstColumns as col (col.key)}
						<option value={col.key}>{col.label}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if project.isCategory}
			<label class="flex items-center gap-2 mt-3">
				<span class="text-[10px] text-mid-grey w-14 shrink-0">Sort by</span>
				<select
					value={project.categorySort}
					onchange={(e) => {
						project.categorySort = /** @type {'default' | 'value-asc' | 'value-desc'} */ (e.currentTarget.value);
					}}
					class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
				>
					<option value="default">X: data order</option>
					<option value="value-asc">Y: ascending</option>
					<option value="value-desc">Y: descending</option>
				</select>
			</label>
		{/if}
	</div>
{/if}

<div class="mt-3 pt-3 border-t border-warm-grey">
	<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Style</p>
	<StylePresetPicker />
</div>

<div class="mt-3 pt-3 border-t border-warm-grey">
	<label class="flex items-center gap-2">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">Chart height</span>
		<input
			type="number"
			min="100"
			max="1200"
			step="50"
			value={project.chartHeight}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				if (v >= 100 && v <= 1200) project.chartHeight = v;
			}}
			class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">px</span>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">X-axis label</span>
		<input
			type="text"
			value={project.xLabel}
			placeholder={xColumnLabel || 'None'}
			oninput={(e) => {
				project.xLabel = e.currentTarget.value;
			}}
			class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">Y-axis label</span>
		<input
			type="text"
			value={project.yLabel}
			placeholder={yColumnLabels || 'None'}
			oninput={(e) => {
				project.yLabel = e.currentTarget.value;
			}}
			class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">Y-axis ticks</span>
		<input
			type="number"
			min="0"
			max="100"
			step="1"
			value={project.yTicks}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				if (v >= 0 && v <= 100) project.yTicks = v;
			}}
			class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">0 = auto</span>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<input
			type="checkbox"
			checked={project.yMinMax}
			onchange={(e) => {
				project.yMinMax = e.currentTarget.checked;
			}}
			class="accent-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">Y min/max ticks</span>
	</label>

	{#if project.hasRightAxis}
		<label class="flex items-center gap-2 mt-3">
			<span class="text-[10px] text-mid-grey uppercase tracking-wide">Y2-axis label</span>
			<input
				type="text"
				value={project.y2Label}
				placeholder="None"
				oninput={(e) => {
					project.y2Label = e.currentTarget.value;
				}}
				class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
			/>
		</label>

		<label class="flex items-center gap-2 mt-3">
			<span class="text-[10px] text-mid-grey uppercase tracking-wide">Y2-axis ticks</span>
			<input
				type="number"
				min="0"
				max="100"
				step="1"
				value={project.y2Ticks}
				oninput={(e) => {
					const v = parseInt(e.currentTarget.value, 10);
					if (v >= 0 && v <= 100) project.y2Ticks = v;
				}}
				class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
			/>
			<span class="text-[10px] text-mid-grey">0 = auto</span>
		</label>

		<label class="flex items-center gap-2 mt-3">
			<input
				type="checkbox"
				checked={project.y2MinMax}
				onchange={(e) => {
					project.y2MinMax = e.currentTarget.checked;
				}}
				class="accent-dark-grey"
			/>
			<span class="text-[10px] text-mid-grey uppercase tracking-wide">Y2 min/max ticks</span>
		</label>
	{/if}

	<label class="flex items-center gap-2 mt-3">
		<input
			type="checkbox"
			checked={project.showXTickLabels}
			onchange={(e) => {
				project.showXTickLabels = e.currentTarget.checked;
			}}
			class="accent-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">Show X tick labels</span>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">X-axis ticks</span>
		<input
			type="number"
			min="0"
			max="100"
			step="1"
			value={project.xTicks}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				if (v >= 0 && v <= 100) project.xTicks = v;
			}}
			class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">0 = auto</span>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">X label angle</span>
		<input
			type="number"
			min="-90"
			max="90"
			step="5"
			value={project.xTickRotate}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				if (v >= -90 && v <= 90) project.xTickRotate = v;
			}}
			class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">degrees</span>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">X-axis height</span>
		<input
			type="number"
			min="0"
			max="300"
			step="10"
			value={project.marginBottom}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				if (v >= 0 && v <= 300) project.marginBottom = v;
			}}
			class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">0 = auto</span>
	</label>
</div>

{#if project.hasData}
	<div class="mt-3 pt-3 border-t border-warm-grey">
		<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Tooltip columns</p>
		<div
			class="flex flex-col gap-1"
			use:dndzone={{ items: tooltipDndItems, flipDurationMs: FLIP_DURATION, type: 'tooltip-cols' }}
			onconsider={handleTooltipConsider}
			onfinalize={handleTooltipFinalize}
		>
			{#each tooltipDndItems as item (item.id)}
				{@const isSelected =
					project.tooltipColumns.length === 0 || project.tooltipColumns.includes(item.key)}
				<div class="flex items-center gap-1.5" animate:flip={{ duration: FLIP_DURATION }}>
					<div
						class="flex-shrink-0 cursor-grab active:cursor-grabbing text-mid-warm-grey hover:text-mid-grey"
						title="Drag to reorder"
					>
						<svg width="8" height="12" viewBox="0 0 10 14" fill="currentColor">
							<circle cx="3" cy="3" r="1.2" />
							<circle cx="7" cy="3" r="1.2" />
							<circle cx="3" cy="7" r="1.2" />
							<circle cx="7" cy="7" r="1.2" />
							<circle cx="3" cy="11" r="1.2" />
							<circle cx="7" cy="11" r="1.2" />
						</svg>
					</div>
					<label class="flex items-center gap-2 flex-1 min-w-0">
						<input
							type="checkbox"
							checked={isSelected}
							onchange={() => {
								const all = project.allColumns.map((c) => c.key);
								if (project.tooltipColumns.length === 0) {
									project.tooltipColumns = all.filter((k) => k !== item.key);
								} else if (isSelected) {
									const next = project.tooltipColumns.filter((k) => k !== item.key);
									project.tooltipColumns = next.length === 0 ? [] : next;
								} else {
									const next = [...project.tooltipColumns, item.key];
									project.tooltipColumns = next;
								}
							}}
							class="accent-dark-grey"
						/>
						<span class="text-[11px] text-dark-grey truncate">{item.label}</span>
					</label>
				</div>
			{/each}
		</div>
	</div>
{/if}

<div class="mt-3 pt-3 border-t border-warm-grey">
	<button
		type="button"
		onclick={() => (showAdvanced = !showAdvanced)}
		class="flex items-center gap-1 text-[10px] text-mid-grey uppercase tracking-wide hover:text-dark-grey"
	>
		<span class="text-[8px]">{showAdvanced ? '▼' : '▶'}</span>
		Advanced
	</button>

	{#if showAdvanced}
		<div class="mt-2">
			<p class="text-[10px] text-mid-grey mb-1">Plot overrides (JSON)</p>
			<textarea
				value={overridesText}
				oninput={(e) => handleOverridesInput(e.currentTarget.value)}
				placeholder={'{"y": {"type": "log"}, "layout": {"title": "..."}}'}
				rows="6"
				class="w-full bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-dark-grey resize-y"
			></textarea>
			{#if parseError}
				<p class="text-[10px] text-red-500 mt-0.5">{parseError}</p>
			{/if}
		</div>
	{/if}
</div>
