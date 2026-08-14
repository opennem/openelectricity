<script>
	import { HORIZONTAL_TYPES, MAP_TYPES } from '$lib/stratify/chart-types.js';
	import { getStratifyContext } from '../../_state/context.js';
	import ColourPicker from '../ColourPicker.svelte';
	import ControlInput from '../ControlInput.svelte';
	import SectionHeader from '../SectionHeader.svelte';

	const project = getStratifyContext();
	const CONTROL_CLASS =
		'flex-1 min-w-0 bg-light-warm-grey/50 border border-warm-grey rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red focus:ring-1 focus:ring-red';
	const NUMBER_CLASS =
		'w-20 bg-light-warm-grey/50 border border-warm-grey rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red focus:ring-1 focus:ring-red';
	const ANNOTATION_PLACEHOLDER =
		'type,date,label,y\nrule,2026-07-01T21:20:00+10:00,Generation high,\npoint,2026-07-02T00:00:00+10:00,Overnight generation,10500';

	/** @type {'csv' | 'parsed'} */
	let activeTab = $state('csv');
	let hasAnnotationData = $derived(project.annotationTable.rows.length > 0);
	let supported = $derived(
		!MAP_TYPES.has(project.chartType) && !HORIZONTAL_TYPES.has(project.chartType)
	);
	/** @type {Array<{ key: Exclude<keyof import('$lib/stratify/annotation-data.js').AnnotationMappings, 'defaultType'>, label: string, optional: boolean }>} */
	const mappingOptions = [
		{ key: 'typeColumn', label: 'Type', optional: true },
		{ key: 'xColumn', label: 'X / date', optional: false },
		{ key: 'labelColumn', label: 'Label', optional: false },
		{ key: 'yColumn', label: 'Y value', optional: true }
	];

	/**
	 * @param {keyof import('$lib/stratify/annotation-data.js').AnnotationMappings} key
	 * @param {string | null} value
	 */
	function setMapping(key, value) {
		project.annotationMappings = { ...project.annotationMappings, [key]: value };
	}

	/**
	 * @param {keyof import('$lib/stratify/annotation-data.js').AnnotationStyleConfig} key
	 * @param {string | number} value
	 */
	function setStyle(key, value) {
		project.annotationStyle = { ...project.annotationStyle, [key]: value };
	}

	/**
	 * @param {'lineWidth' | 'fontSize' | 'pointRadius'} key
	 * @param {string} raw
	 * @param {number} min
	 * @param {number} max
	 */
	function setNumericStyle(key, raw, min, max) {
		const value = Number(raw);
		if (Number.isFinite(value) && value >= min && value <= max) setStyle(key, value);
	}

	/** @param {number} rowNumber */
	function getRowOption(rowNumber) {
		return project.annotationRowOptions[String(rowNumber)] ?? {};
	}

	/**
	 * @param {number} rowNumber
	 * @param {import('$lib/stratify/annotation-data.js').AnnotationRowOption} patch
	 */
	function setRowOption(rowNumber, patch) {
		const key = String(rowNumber);
		project.annotationRowOptions = {
			...project.annotationRowOptions,
			[key]: { ...getRowOption(rowNumber), ...patch }
		};
	}

	/** @param {{ values: Record<string, string> }} row */
	function getRowType(row) {
		const mapped = project.annotationMappings.typeColumn;
		return mapped
			? row.values[mapped]?.trim().toLowerCase()
			: project.annotationMappings.defaultType;
	}

	/** @param {{ rowNumber: number, values: Record<string, string> }} row */
	function getRowLabel(row) {
		const mapped = project.annotationMappings.labelColumn;
		return (mapped ? row.values[mapped] : '') || `Row ${row.rowNumber}`;
	}

	/** @param {{ values: Record<string, string> }} row */
	function getRowY(row) {
		const mapped = project.annotationMappings.yColumn;
		return mapped ? row.values[mapped]?.trim() : '';
	}
</script>

{#if !supported}
	<div class="mb-8 bg-light-warm-grey/50 px-3 py-3 text-[10px] leading-relaxed text-mid-grey">
		Data annotations are currently supported on charts with a horizontal X axis, not maps or
		horizontal bar and waterfall charts.
	</div>
{/if}

<SectionHeader label="Annotation data">
	<div class="space-y-2">
		{#if hasAnnotationData}
			<div class="flex items-end justify-between">
				<div class="flex gap-0.5">
					<button
						type="button"
						class="px-2 py-1 text-[10px] uppercase tracking-wide rounded-t {activeTab === 'csv'
							? 'bg-warm-grey/50 text-dark-grey'
							: 'text-mid-grey hover:text-dark-grey'}"
						onclick={() => (activeTab = 'csv')}>CSV</button
					>
					<button
						type="button"
						class="px-2 py-1 text-[10px] uppercase tracking-wide rounded-t {activeTab === 'parsed'
							? 'bg-warm-grey/50 text-dark-grey'
							: 'text-mid-grey hover:text-dark-grey'}"
						onclick={() => (activeTab = 'parsed')}>Parsed</button
					>
				</div>
				<button
					type="button"
					class="text-[10px] text-mid-grey hover:text-dark-red"
					onclick={() => {
						project.annotationCsvText = '';
						project.annotationRowOptions = {};
						project.annotationHeaderSignature = '';
					}}>Clear</button
				>
			</div>
		{/if}

		{#if !hasAnnotationData || activeTab === 'csv'}
			<textarea
				bind:value={project.annotationCsvText}
				rows="7"
				class="w-full resize-y rounded-lg border border-warm-grey bg-warm-grey/50 p-2.5 font-mono text-[11px] outline-none focus:bg-warm-grey"
				placeholder={ANNOTATION_PLACEHOLDER}
			></textarea>
		{:else}
			<div class="max-h-64 overflow-auto rounded-lg bg-warm-grey/50">
				<table class="w-full border-collapse font-mono text-[10px]">
					<thead class="sticky top-0 bg-mid-warm-grey/30">
						<tr>
							{#each project.annotationTable.columns as column (column.key)}
								<th class="whitespace-nowrap px-2 py-1.5 text-left font-medium">{column.label}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each project.annotationTable.rows as row (row.rowNumber)}
							<tr>
								{#each project.annotationTable.columns as column (column.key)}
									<td class="whitespace-nowrap border-t border-warm-grey px-2 py-1"
										>{row.values[column.key]}</td
									>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#each project.annotationErrors as error (error)}
			<p class="text-[10px] text-dark-red">{error}</p>
		{/each}
		{#each project.annotationWarnings as warning (warning)}
			<p class="text-[10px] text-amber-700">{warning}</p>
		{/each}
		{#if hasAnnotationData}
			<p class="text-[10px] text-mid-grey">
				{project.dataAnnotations.length} of {project.annotationTable.rows.length} rows ready
			</p>
		{/if}
	</div>
</SectionHeader>

{#if hasAnnotationData}
	<SectionHeader label="Column mapping">
		<div class="flex flex-col gap-2">
			{#each mappingOptions as mapping (mapping.key)}
				<ControlInput label={mapping.label}>
					<select
						value={project.annotationMappings[mapping.key] ?? ''}
						onchange={(event) => setMapping(mapping.key, event.currentTarget.value || null)}
						class={CONTROL_CLASS}
					>
						{#if mapping.optional}<option value="">None</option>{/if}
						{#each project.annotationTable.columns as column (column.key)}
							<option value={column.key}>{column.label}</option>
						{/each}
					</select>
				</ControlInput>
			{/each}

			{#if !project.annotationMappings.typeColumn}
				<ControlInput label="Default type">
					<select
						value={project.annotationMappings.defaultType}
						onchange={(event) => setMapping('defaultType', event.currentTarget.value)}
						class={CONTROL_CLASS}
					>
						<option value="rule">Rule</option>
						<option value="point">Point</option>
					</select>
				</ControlInput>
			{/if}
		</div>
	</SectionHeader>

	<SectionHeader label="Annotation options">
		<div class="flex flex-col gap-2">
			{#each project.annotationTable.rows as row (row.rowNumber)}
				{@const option = getRowOption(row.rowNumber)}
				{@const type = getRowType(row)}
				<div class="space-y-2 rounded-lg border border-warm-grey p-2.5">
					<div class="flex min-w-0 items-center justify-between gap-2">
						<div class="min-w-0">
							<p class="truncate text-[11px] text-dark-grey">{getRowLabel(row)}</p>
							<p class="text-[9px] uppercase tracking-wide text-mid-grey">
								{type || 'Invalid type'}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-1.5">
							<ColourPicker
								value={option.colour ?? project.annotationStyle.defaultColour}
								onChange={(colour) => setRowOption(row.rowNumber, { colour })}
							/>
							<span class="text-[9px] text-mid-grey"
								>{option.colour ?? project.annotationStyle.defaultColour}</span
							>
						</div>
					</div>

					{#if type === 'point'}
						<ControlInput label="Position by">
							<select
								value={option.positionBy ?? 'y'}
								onchange={(event) => {
									if (event.currentTarget.value === 'y') {
										setRowOption(row.rowNumber, { positionBy: 'y', series: null });
									} else {
										setRowOption(row.rowNumber, {
											positionBy: 'series',
											series: project.orderedSeriesNames[0] ?? null,
											axis: option.axis ?? 'left'
										});
									}
								}}
								class={CONTROL_CLASS}
							>
								<option value="y">Y value</option>
								<option value="series">Series</option>
							</select>
						</ControlInput>

						{#if (option.positionBy ?? 'y') === 'y'}
							<ControlInput label="Y value">
								<span class="min-w-0 flex-1 truncate text-[11px] text-dark-grey">
									{#if project.annotationMappings.yColumn}
										{getRowY(row) || 'Missing in CSV'}
									{:else}
										Choose a Y column
									{/if}
								</span>
							</ControlInput>
						{:else}
							<ControlInput label="Series">
								<select
									value={option.series ?? ''}
									onchange={(event) =>
										setRowOption(row.rowNumber, {
											series: event.currentTarget.value || null
										})}
									class={CONTROL_CLASS}
								>
									<option value="">Choose series</option>
									{#each project.orderedSeriesNames as series (series)}
										<option value={series}>{project.seriesLabels[series] ?? series}</option>
									{/each}
								</select>
							</ControlInput>
						{/if}

						<ControlInput label="Axis">
							<select
								value={option.axis ?? 'left'}
								onchange={(event) =>
									setRowOption(row.rowNumber, {
										axis: /** @type {'left' | 'right'} */ (event.currentTarget.value)
									})}
								class={CONTROL_CLASS}
							>
								<option value="left">Left</option>
								<option value="right">Right</option>
							</select>
						</ControlInput>
					{/if}
				</div>
			{/each}
		</div>
	</SectionHeader>

	<SectionHeader label="Appearance">
		<div class="flex flex-col gap-2">
			<ControlInput label="Fallback colour">
				<ColourPicker
					value={project.annotationStyle.defaultColour}
					onChange={(colour) => setStyle('defaultColour', colour)}
				/>
				<span class="truncate text-[10px] text-mid-grey"
					>{project.annotationStyle.defaultColour}</span
				>
			</ControlInput>
			<ControlInput label="Line style">
				<select
					value={project.annotationStyle.lineStyle}
					onchange={(event) => setStyle('lineStyle', event.currentTarget.value)}
					class={CONTROL_CLASS}
				>
					<option value="solid">Solid</option>
					<option value="dashed">Dashed</option>
					<option value="dotted">Dotted</option>
				</select>
			</ControlInput>
			<ControlInput label="Line width" suffix="px">
				<input
					type="number"
					min="0"
					max="10"
					step="0.5"
					value={project.annotationStyle.lineWidth}
					oninput={(event) => setNumericStyle('lineWidth', event.currentTarget.value, 0, 10)}
					class={NUMBER_CLASS}
				/>
			</ControlInput>
			<ControlInput label="Label size" suffix="px">
				<input
					type="number"
					min="6"
					max="32"
					step="1"
					value={project.annotationStyle.fontSize}
					oninput={(event) => setNumericStyle('fontSize', event.currentTarget.value, 6, 32)}
					class={NUMBER_CLASS}
				/>
			</ControlInput>
			<ControlInput label="Label weight">
				<select
					value={project.annotationStyle.fontWeight}
					onchange={(event) => setStyle('fontWeight', event.currentTarget.value)}
					class={CONTROL_CLASS}
				>
					<option value="normal">Normal</option>
					<option value="bold">Bold</option>
				</select>
			</ControlInput>
			<ControlInput label="Point radius" suffix="px">
				<input
					type="number"
					min="1"
					max="30"
					step="1"
					value={project.annotationStyle.pointRadius}
					oninput={(event) => setNumericStyle('pointRadius', event.currentTarget.value, 1, 30)}
					class={NUMBER_CLASS}
				/>
			</ControlInput>
		</div>
	</SectionHeader>
{/if}
