<script>
	import ChartTypeSelector from '../ChartTypeSelector.svelte';
	import SectionGroup from '../SectionGroup.svelte';
	import SectionHeader from '../SectionHeader.svelte';
	import { getStratifyContext } from '../../_state/context.js';
	import { HORIZONTAL_TYPES } from '$lib/stratify/chart-types.js';

	const project = getStratifyContext();

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
	// Columns eligible to be picked as a Y series: numeric, not used by the
	// colour-series picker, and not used by the facet (Partition by) picker.
	let eligibleYColumns = $derived(
		nonFirstColumns.filter(
			(col) =>
				col.isNumeric &&
				col.key !== project.colourSeries &&
				col.key !== project.facetColumn
		)
	);
	let yColumnLabels = $derived(eligibleYColumns.map((col) => col.label).join(', '));
	let visibleYColumns = $derived(
		eligibleYColumns.filter((c) => !project.hiddenSeries.includes(c.key))
	);
	let selectedY = $derived(visibleYColumns.length === 1 ? visibleYColumns[0]?.key : '');

	// --- Advanced ---
	let isHorizontal = $derived(HORIZONTAL_TYPES.has(project.chartType));

	// Chart types that support multiple Y series
	let allowMultipleY = $derived(
		project.chartType === 'line' ||
			project.chartType === 'area' ||
			project.chartType === 'column-stacked' ||
			project.chartType === 'column-grouped' ||
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
<SectionHeader label="Type">
	<ChartTypeSelector />
</SectionHeader>

<!-- ═══ Section 2: Data Encoding ═══ -->
{#if project.hasData}
	<SectionHeader label="Data Encoding">
		<div class="flex flex-col gap-2">
			<!-- Category axis: column + type -->
			<div class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0"
					>{isHorizontal ? 'Y Axis' : 'X Axis'}</span
				>
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
						project.displayMode = /** @type {'auto' | 'time-series' | 'category' | 'linear'} */ (
							e.currentTarget.value
						);
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-[72px] shrink-0"
				>
					<option value="auto">Auto</option>
					<option value="category">Ordinal</option>
					<option value="time-series">Temporal</option>
					<option value="linear">Linear</option>
				</select>
			</div>

			<!-- Value axis -->
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0"
					>{isHorizontal ? 'X Axis' : 'Y Axis'}</span
				>
				<select
					value={selectedY || (allowMultipleY ? '' : eligibleYColumns[0]?.key || '')}
					onchange={(e) => {
						const val = e.currentTarget.value;
						if (val) {
							project.hiddenSeries = eligibleYColumns
								.filter((c) => c.key !== val)
								.map((c) => c.key);
						} else {
							project.hiddenSeries = [];
						}
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				>
					{#if allowMultipleY && eligibleYColumns.length > 1}
						<option value="">All</option>
					{/if}
					{#each eligibleYColumns as col (col.key)}
						<option value={col.key}>{col.label}</option>
					{/each}
				</select>
			</label>

			<!-- Z Colour -->
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Z Colour</span>
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
						{#if col.key !== project.facetColumn}
							<option value={col.key}>{col.label}</option>
						{/if}
					{/each}
				</select>
			</label>

			<!-- Partition by (small multiples) -->
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Partition by</span>
				<select
					value={project.facetColumn ?? ''}
					onchange={(e) => {
						const val = e.currentTarget.value;
						project.facetColumn = val || null;
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				>
					<option value="">None</option>
					{#each nonFirstColumns as col (col.key)}
						{#if col.key !== project.colourSeries}
							<option value={col.key}>{col.label}</option>
						{/if}
					{/each}
				</select>
			</label>

			<!-- Animate options (only meaningful when partitioning) -->
			{#if project.facetColumn}
				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0"></span>
					<input
						type="checkbox"
						checked={project.animateAsOneChart}
						onchange={(e) => {
							project.animateAsOneChart = e.currentTarget.checked;
						}}
						class="accent-dark-grey"
					/>
					<span class="text-[10px] text-mid-grey">Animate as one chart</span>
				</label>

				{#if project.animateAsOneChart}
					<label class="flex items-center gap-2">
						<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Speed</span>
						<input
							type="number"
							min="100"
							max="3000"
							step="100"
							value={project.animationSpeedMs}
							oninput={(e) => {
								const v = parseInt(e.currentTarget.value, 10);
								if (v >= 100 && v <= 3000) project.animationSpeedMs = v;
							}}
							class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
						/>
						<span class="text-[10px] text-mid-grey">ms / frame</span>
					</label>
					<label class="flex items-center gap-2">
						<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0"></span>
						<input
							type="checkbox"
							checked={project.animateAutoLoop}
							onchange={(e) => {
								project.animateAutoLoop = e.currentTarget.checked;
							}}
							class="accent-dark-grey"
						/>
						<span class="text-[10px] text-mid-grey">Auto-loop</span>
					</label>
				{/if}
			{/if}

			{#if project.chartType === 'line' || project.chartType === 'area'}
				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Curve</span>
					<select
						value={project.chartCurve}
						onchange={(e) => {
							project.chartCurve = e.currentTarget.value;
						}}
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
					>
						<option value="linear">Linear</option>
						<option value="monotone-x">Smooth (monotone)</option>
						<option value="basis">Smooth (basis)</option>
						<option value="natural">Smooth (natural)</option>
						<option value="step">Step</option>
						<option value="step-before">Step before</option>
						<option value="step-after">Step after</option>
					</select>
				</label>
			{/if}

			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Transform</span>
				<select
					value={project.dataTransform}
					onchange={(e) => {
						project.dataTransform = /** @type {'none' | 'cumulative'} */ (e.currentTarget.value);
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1"
				>
					<option value="none">None</option>
					<option value="cumulative">Cumulative</option>
				</select>
			</label>

			<!-- Sort (category only) -->
			{#if project.isCategory}
				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Sort</span>
					<select
						value={project.categorySort}
						onchange={(e) => {
							project.categorySort = /** @type {any} */ (e.currentTarget.value);
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
	</SectionHeader>
{/if}

<!-- ═══ Section 3: Appearance ═══ -->
<SectionHeader label="Axes & Layout">
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
		{#if project.facetColumn}
			<span class="text-[10px] text-mid-grey italic">per panel (partitioned)</span>
		{/if}
	</label>

	<!-- X Axis appearance -->
	<div class="mt-4">
		<p class="text-[10px] text-dark-grey font-medium mb-1.5">
			{isHorizontal ? 'X Axis (values)' : 'X Axis'}
		</p>
		<div class="flex flex-col gap-2 pl-2 border-l-2 border-light-warm-grey">
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Label</span>
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
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Ticks</span>
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
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Angle</span>
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
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Height</span>
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
		<p class="text-[10px] text-dark-grey font-medium mb-1.5">
			{isHorizontal ? 'Y Axis (categories)' : 'Y Axis'}
		</p>
		<div class="flex flex-col gap-2 pl-2 border-l-2 border-light-warm-grey">
			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Label</span>
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
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Ticks</span>
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

			{#if !isHorizontal}
				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Min</span>
					<input
						type="number"
						value={project.y1Min ?? ''}
						placeholder="auto"
						oninput={(e) => {
							const v = e.currentTarget.value;
							project.y1Min = v === '' ? null : Number(v);
						}}
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1 min-w-0"
					/>
					<span class="text-[10px] text-mid-grey">blank = auto</span>
				</label>

				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Max</span>
					<input
						type="number"
						value={project.y1Max ?? ''}
						placeholder="auto"
						oninput={(e) => {
							const v = e.currentTarget.value;
							project.y1Max = v === '' ? null : Number(v);
						}}
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1 min-w-0"
					/>
					<span class="text-[10px] text-mid-grey">blank = auto</span>
				</label>
			{/if}

			<label class="flex items-center gap-2">
				<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Width</span>
				<input
					type="number"
					min="0"
					max="300"
					step="10"
					value={project.marginLeft}
					oninput={(e) => {
						const v = parseInt(e.currentTarget.value, 10);
						if (v >= 0 && v <= 300) project.marginLeft = v;
					}}
					class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey w-20"
				/>
				<span class="text-[10px] text-mid-grey">0 = auto</span>
			</label>
		</div>
	</div>

	<!-- Y2 Axis appearance (conditional) -->
	{#if project.hasRightAxis}
		<div class="mt-4">
			<p class="text-[10px] text-dark-grey font-medium mb-1.5">Y2 Axis</p>
			<div class="flex flex-col gap-2 pl-2 border-l-2 border-light-warm-grey">
				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Label</span>
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
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Ticks</span>
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

				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Min</span>
					<input
						type="number"
						value={project.y2Min ?? ''}
						placeholder="auto"
						oninput={(e) => {
							const v = e.currentTarget.value;
							project.y2Min = v === '' ? null : Number(v);
						}}
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1 min-w-0"
					/>
					<span class="text-[10px] text-mid-grey">blank = auto</span>
				</label>

				<label class="flex items-center gap-2">
					<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">Max</span>
					<input
						type="number"
						value={project.y2Max ?? ''}
						placeholder="auto"
						oninput={(e) => {
							const v = e.currentTarget.value;
							project.y2Max = v === '' ? null : Number(v);
						}}
						class="bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey flex-1 min-w-0"
					/>
					<span class="text-[10px] text-mid-grey">blank = auto</span>
				</label>
			</div>
		</div>
	{/if}
</SectionHeader>

<!-- ═══ Section 4: Advanced ═══ -->
<SectionGroup>
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
</SectionGroup>
