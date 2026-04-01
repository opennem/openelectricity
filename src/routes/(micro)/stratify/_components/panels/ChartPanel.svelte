<script>
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import ChartTypeSelector from '../ChartTypeSelector.svelte';
	import StylePresetPicker from '../StylePresetPicker.svelte';
	import { getStratifyContext } from '../../_state/context.js';

	const project = getStratifyContext();
	const FLIP_DURATION = 150;

	// --- Tooltip DnD ---
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
		const selected =
			project.tooltipColumns.length > 0
				? new Set(project.tooltipColumns)
				: new Set(project.allColumns.map((c) => c.key));
		project.tooltipColumns = tooltipDndItems
			.filter((item) => selected.has(item.key))
			.map((item) => item.key);
	}

	// --- Derived values ---
	let rawColumns = $derived.by(() => {
		const text = project.csvText?.trim();
		if (!text) return [];
		const firstLine = text.split('\n')[0] ?? '';
		const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : ';';
		return firstLine.split(delim).map((/** @type {string} */ h) => {
			const label = h.trim().replace(/^["']|["']$/g, '');
			const key = label
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '_')
				.replace(/^_|_$/g, '');
			return { key, label };
		});
	});

	let xColumnLabel = $derived(project.allColumns[0]?.label ?? '');
	let nonFirstColumns = $derived(project.allColumns.slice(1));
	let yColumnLabels = $derived(
		nonFirstColumns
			.filter((col) => col.isNumeric && col.key !== project.colourSeries)
			.map((col) => col.label)
			.join(', ')
	);
	let visibleYColumns = $derived(
		nonFirstColumns.filter((c) => !project.hiddenSeries.includes(c.key))
	);
	let selectedY = $derived(visibleYColumns.length === 1 ? visibleYColumns[0]?.key : '');

	// --- Advanced ---
	let isHorizontal = $derived(
		project.chartType === 'bar' ||
			project.chartType === 'bar-stacked' ||
			project.chartType === 'bar-grouped'
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

<!-- ═══ Section 1: Chart Type ═══ -->
<ChartTypeSelector />

<!-- ═══ Section 2: Data Encoding ═══ -->
{#if project.hasData}
	<div class="mt-3 pt-3 border-t border-warm-grey">
		<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Data Encoding</p>

		<div class="flex flex-col gap-2">
			<!-- Category axis: column + type -->
			<div class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">{isHorizontal ? 'Y Axis' : 'X Axis'}</span>
				<select
					value={project.xColumn || rawColumns[0]?.key || ''}
					onchange={(e) => {
						const val = e.currentTarget.value;
						project.xColumn = val === rawColumns[0]?.key ? '' : val;
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				>
					{#each rawColumns as col (col.key)}
						<option value={col.key}>{col.label}</option>
					{/each}
				</select>
				<select
					value={project.displayMode}
					onchange={(e) => {
						project.displayMode = /** @type {'auto' | 'time-series' | 'category'} */ (
							e.currentTarget.value
						);
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-[72px] shrink-0"
				>
					<option value="auto">Auto</option>
					<option value="category">Ordinal</option>
					<option value="time-series">Temporal</option>
				</select>
			</div>

			<!-- Value axis -->
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">{isHorizontal ? 'X Axis' : 'Y Axis'}</span>
				<select
					value={selectedY || nonFirstColumns[0]?.key || ''}
					onchange={(e) => {
						const val = e.currentTarget.value;
						project.hiddenSeries = nonFirstColumns
							.filter((c) => c.key !== val)
							.map((c) => c.key);
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				>
					{#each nonFirstColumns as col (col.key)}
						<option value={col.key}>{col.label}</option>
					{/each}
				</select>
			</label>

			<!-- Z Colour -->
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">Z Colour</span>
				<select
					value={project.colourSeries ?? ''}
					onchange={(e) => {
						const val = e.currentTarget.value;
						project.colourSeries = val || null;
						project.userSeriesColours = {};
						project.userSeriesLabels = {};
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				>
					<option value="">None</option>
					{#each nonFirstColumns as col (col.key)}
						<option value={col.key}>{col.label}</option>
					{/each}
				</select>
			</label>

			<!-- Sort (category only) -->
			{#if project.isCategory}
				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-16 shrink-0">Sort</span>
					<select
						value={project.categorySort}
						onchange={(e) => {
							project.categorySort =
								/** @type {any} */ (
									e.currentTarget.value
								);
						}}
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
					>
						<option value="default">Data order</option>
						<option value="x-asc">Category: A to Z</option>
						<option value="x-desc">Category: Z to A</option>
						<option value="value-asc">Value: low to high</option>
						<option value="value-desc">Value: high to low</option>
					</select>
				</label>
			{/if}
		</div>
	</div>
{/if}

<!-- ═══ Section 3: Appearance ═══ -->
<div class="mt-3 pt-3 border-t border-warm-grey">
	<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Appearance</p>

	<StylePresetPicker />

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey">Chart height</span>
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
			class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
		/>
		<span class="text-[10px] text-mid-grey">px</span>
	</label>

	<!-- X Axis appearance -->
	<div class="mt-4">
		<p class="text-[10px] text-dark-grey font-medium mb-1.5">{isHorizontal ? 'X Axis (values)' : 'X Axis'}</p>
		<div class="flex flex-col gap-2 pl-2 border-l-2 border-light-warm-grey">
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">Label</span>
				<input
					type="text"
					value={project.xLabel}
					placeholder={xColumnLabel || 'None'}
					oninput={(e) => {
						project.xLabel = e.currentTarget.value;
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				/>
			</label>

			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={project.showXTickLabels}
					onchange={(e) => {
						project.showXTickLabels = e.currentTarget.checked;
					}}
					class="accent-dark-grey"
				/>
				<span class="text-[10px] text-mid-grey">Show tick labels</span>
			</label>

			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">Ticks</span>
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
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
				/>
				<span class="text-[10px] text-mid-grey">0 = auto</span>
			</label>

			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">Angle</span>
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
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
				/>
				<span class="text-[10px] text-mid-grey">degrees</span>
			</label>

			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">Height</span>
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
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
				/>
				<span class="text-[10px] text-mid-grey">0 = auto</span>
			</label>
		</div>
	</div>

	<!-- Y Axis appearance -->
	<div class="mt-4">
		<p class="text-[10px] text-dark-grey font-medium mb-1.5">{isHorizontal ? 'Y Axis (categories)' : 'Y Axis'}</p>
		<div class="flex flex-col gap-2 pl-2 border-l-2 border-light-warm-grey">
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">Label</span>
				<input
					type="text"
					value={project.yLabel}
					placeholder={yColumnLabels || 'None'}
					oninput={(e) => {
						project.yLabel = e.currentTarget.value;
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				/>
			</label>

			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-16 shrink-0">Ticks</span>
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
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
				/>
				<span class="text-[10px] text-mid-grey">0 = auto</span>
			</label>

			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={project.yMinMax}
					onchange={(e) => {
						project.yMinMax = e.currentTarget.checked;
					}}
					class="accent-dark-grey"
				/>
				<span class="text-[10px] text-mid-grey">Min/max ticks only</span>
			</label>
		</div>
	</div>

	<!-- Y2 Axis appearance (conditional) -->
	{#if project.hasRightAxis}
		<div class="mt-4">
			<p class="text-[10px] text-dark-grey font-medium mb-1.5">Y2 Axis</p>
			<div class="flex flex-col gap-2 pl-2 border-l-2 border-light-warm-grey">
				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-16 shrink-0">Label</span>
					<input
						type="text"
						value={project.y2Label}
						placeholder="None"
						oninput={(e) => {
							project.y2Label = e.currentTarget.value;
						}}
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
					/>
				</label>

				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-16 shrink-0">Ticks</span>
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
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
					/>
					<span class="text-[10px] text-mid-grey">0 = auto</span>
				</label>

				<label class="flex items-center gap-2">
					<input
						type="checkbox"
						checked={project.y2MinMax}
						onchange={(e) => {
							project.y2MinMax = e.currentTarget.checked;
						}}
						class="accent-dark-grey"
					/>
					<span class="text-[10px] text-mid-grey">Min/max ticks only</span>
				</label>
			</div>
		</div>
	{/if}
</div>

<!-- ═══ Section 4: Tooltip ═══ -->
{#if project.hasData}
	<div class="mt-3 pt-3 border-t border-warm-grey">
		<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Tooltip</p>
		<div
			class="flex flex-col gap-1"
			use:dndzone={{
				items: tooltipDndItems,
				flipDurationMs: FLIP_DURATION,
				type: 'tooltip-cols'
			}}
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
									project.tooltipColumns = [...project.tooltipColumns, item.key];
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

<!-- ═══ Section 5: Advanced ═══ -->
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
