<script>
	import { Plus, Trash2 } from '@lucide/svelte';
	import { HORIZONTAL_TYPES, MAP_TYPES } from '$lib/stratify/chart-types.js';
	import { getStratifyContext } from '../../_state/context.js';
	import ColourPicker from '../ColourPicker.svelte';
	import ControlInput, { CONTROL_INPUT_CLASS } from '../ControlInput.svelte';
	import SectionHeader from '../SectionHeader.svelte';
	import StratifyButton from '../StratifyButton.svelte';

	const project = getStratifyContext();
	const CONTROL_CLASS = `min-w-0 flex-1 ${CONTROL_INPUT_CLASS}`;
	const ERROR_CONTROL_CLASS = '!border-dark-red focus:!border-dark-red focus:!ring-dark-red';
	const NUMBER_CLASS = `w-20 ${CONTROL_INPUT_CLASS}`;
	const DEFAULT_LABELS = { rule: 'Rule annotation', point: 'Point annotation' };
	const POINT_LABEL_POSITIONS = ['top', 'left', 'right', 'bottom'];

	let hasAnnotations = $derived(project.annotationItems.length > 0);
	let supported = $derived(
		!MAP_TYPES.has(project.chartType) && !HORIZONTAL_TYPES.has(project.chartType)
	);
	let xLabel = $derived(
		project.parsedData.mode === 'time-series'
			? 'Date / time'
			: project.parsedData.mode === 'category'
				? 'Category'
				: 'X value'
	);
	let xPlaceholder = $derived(
		project.parsedData.mode === 'time-series'
			? '2026-07-01T21:20:00+10:00'
			: project.parsedData.mode === 'category'
				? 'Category name'
				: '0'
	);
	let xOptions = $derived.by(() => {
		/** @type {Array<{ value: string, label: string }>} */
		const options = [];
		/** @type {Record<string, boolean>} */
		const seen = Object.create(null);
		for (const row of project.parsedData.data) {
			const rawValue =
				project.parsedData.mode === 'time-series'
					? row._dateStr
					: project.parsedData.mode === 'category'
						? row.category
						: row.linear;
			const value = rawValue == null ? '' : String(rawValue);
			if (!value || seen[value]) continue;
			seen[value] = true;
			options.push({ value, label: value });
		}
		return options;
	});

	/**
	 * @param {import('$lib/stratify/annotation-data.js').AnnotationItem} item
	 */
	function getAppearance(item) {
		return { ...project.annotationStyle, ...(item.appearance ?? {}) };
	}

	/**
	 * @param {import('$lib/stratify/annotation-data.js').AnnotationItem} item
	 * @param {keyof import('$lib/stratify/annotation-data.js').AnnotationStyleConfig} key
	 * @param {string | number} value
	 */
	function setStyle(item, key, value) {
		project.updateAnnotation(item.id, {
			appearance: { ...getAppearance(item), [key]: value }
		});
	}

	/**
	 * @param {import('$lib/stratify/annotation-data.js').AnnotationItem} item
	 * @param {'lineWidth' | 'fontSize' | 'pointRadius' | 'labelMaxWidth'} key
	 * @param {string} raw
	 * @param {number} min
	 * @param {number} max
	 */
	function setNumericStyle(item, key, raw, min, max) {
		const value = Number(raw);
		if (Number.isFinite(value) && value >= min && value <= max) setStyle(item, key, value);
	}

	/**
	 * @param {import('$lib/stratify/annotation-data.js').AnnotationItem} item
	 * @param {'rule' | 'point'} type
	 */
	function setAnnotationType(item, type) {
		const hasCustomLabel =
			item.label.trim() !== '' && !Object.values(DEFAULT_LABELS).includes(item.label);
		const defaultX =
			project.parsedData.mode === 'time-series' && item.xSource === 'data' && !item.x.trim()
				? (xOptions[0]?.value ?? '')
				: item.x;
		const shouldDefaultSeries =
			type === 'point' && item.type !== 'point' && !item.y.trim() && !item.series;
		project.updateAnnotation(item.id, {
			type,
			label: hasCustomLabel ? item.label : DEFAULT_LABELS[type],
			x: defaultX,
			positionBy: shouldDefaultSeries ? 'series' : item.positionBy,
			series: shouldDefaultSeries ? (project.orderedSeriesNames[0] ?? null) : item.series,
			labelPosition:
				type === 'point' && !POINT_LABEL_POSITIONS.includes(item.labelPosition ?? 'top')
					? 'top'
					: (item.labelPosition ?? 'top')
		});
	}
</script>

{#if !supported}
	<div class="mb-8 bg-light-warm-grey/50 px-3 py-3 text-[10px] leading-relaxed text-mid-grey">
		Annotations are currently supported on charts with a horizontal X axis, not maps or horizontal
		bar and waterfall charts.
	</div>
{/if}

<SectionHeader label="Annotations">
	<div class="space-y-3">
		{#if !hasAnnotations}
			<div class="rounded-lg border border-dashed border-mid-warm-grey px-4 py-5 text-left">
				<p class="mb-0 text-xs text-mid-grey">
					Add a rule or point annotation, then choose where it appears on the chart.
				</p>
			</div>
			<div class="border-t border-warm-grey pt-3">
				<StratifyButton onclick={() => project.addAnnotation()}>
					<Plus size={14} />
					Add annotation
				</StratifyButton>
			</div>
		{:else}
			{#each project.annotationItems as item, index (item.id)}
				{@const appearance = getAppearance(item)}
				{@const hasXError = (item.type === 'rule' || item.type === 'point') && !item.x.trim()}
				{@const hasLabelError =
					(item.type === 'rule' || item.type === 'point') && !item.label.trim()}
				<div
					class="overflow-hidden rounded-lg border border-warm-grey transition-colors duration-150 focus-within:border-mid-grey"
				>
					<div
						class="flex items-center justify-between gap-3 border-b border-warm-grey bg-light-warm-grey/50 px-3 py-2.5"
					>
						<p class="mb-0 text-xs font-medium text-dark-grey">Annotation {index + 1}</p>
						<button
							type="button"
							class="rounded-md p-1.5 text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-red focus:outline-none focus:ring-2 focus:ring-red"
							onclick={() => project.removeAnnotation(item.id)}
							aria-label={`Remove annotation ${index + 1}`}
							title="Remove annotation"
						>
							<Trash2 size={14} />
						</button>
					</div>

					<div class="space-y-3 p-4">
						<ControlInput label="Type">
							<select
								value={item.type}
								onchange={(event) =>
									setAnnotationType(
										item,
										/** @type {'rule' | 'point'} */ (event.currentTarget.value)
									)}
								class={CONTROL_CLASS}
							>
								<option value="" disabled>Choose type</option>
								<option value="rule">Rule</option>
								<option value="point">Point</option>
							</select>
						</ControlInput>

						{#if item.type === 'rule' || item.type === 'point'}
							<ControlInput label="X source">
								<select
									value={item.xSource}
									onchange={(event) => {
										const xSource = /** @type {'data' | 'custom'} */ (event.currentTarget.value);
										project.updateAnnotation(item.id, {
											xSource,
											x: xSource === 'data' ? '' : item.x
										});
									}}
									class={CONTROL_CLASS}
								>
									<option value="data" disabled={xOptions.length === 0}>Existing data</option>
									<option value="custom">Custom value</option>
								</select>
							</ControlInput>

							{#if item.xSource === 'data'}
								<ControlInput label={xLabel} error={hasXError ? 'Choose a point.' : ''}>
									<select
										value={item.x}
										onchange={(event) =>
											project.updateAnnotation(item.id, { x: event.currentTarget.value })}
										class={`${CONTROL_CLASS} ${hasXError ? ERROR_CONTROL_CLASS : ''}`}
										aria-invalid={hasXError}
									>
										<option value="" disabled>Choose point</option>
										{#each xOptions as option (option.value)}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
								</ControlInput>
							{:else}
								<ControlInput label={xLabel} error={hasXError ? 'Enter a value.' : ''}>
									<input
										type={project.parsedData.mode === 'linear' ? 'number' : 'text'}
										value={item.x}
										oninput={(event) =>
											project.updateAnnotation(item.id, { x: event.currentTarget.value })}
										placeholder={xPlaceholder}
										class={`${CONTROL_CLASS} ${hasXError ? ERROR_CONTROL_CLASS : ''}`}
										aria-invalid={hasXError}
									/>
								</ControlInput>
							{/if}

							<ControlInput label="Label" error={hasLabelError ? 'Enter a label.' : ''}>
								<input
									type="text"
									value={item.label}
									oninput={(event) =>
										project.updateAnnotation(item.id, { label: event.currentTarget.value })}
									placeholder="Annotation label"
									class={`${CONTROL_CLASS} ${hasLabelError ? ERROR_CONTROL_CLASS : ''}`}
									aria-invalid={hasLabelError}
								/>
							</ControlInput>

							<ControlInput label="Label position">
								<select
									value={item.labelPosition ?? 'top'}
									onchange={(event) =>
										project.updateAnnotation(item.id, {
											labelPosition:
												/** @type {import('$lib/stratify/annotation-data.js').AnnotationLabelPosition} */ (
													event.currentTarget.value
												)
										})}
									class={CONTROL_CLASS}
								>
									{#if item.type === 'rule'}
										<option value="top-left">Top left</option>
									{/if}
									<option value="top">Top centre</option>
									{#if item.type === 'rule'}
										<option value="top-right">Top right</option>
									{/if}
									<option value="left">{item.type === 'rule' ? 'Middle left' : 'Left'}</option>
									<option value="right">{item.type === 'rule' ? 'Middle right' : 'Right'}</option>
									{#if item.type === 'rule'}
										<option value="bottom-left">Bottom left</option>
									{/if}
									<option value="bottom">Bottom centre</option>
									{#if item.type === 'rule'}
										<option value="bottom-right">Bottom right</option>
									{/if}
								</select>
							</ControlInput>

							{#if item.type === 'point'}
								<ControlInput label="Position by">
									<select
										value={item.positionBy}
										onchange={(event) => {
											if (event.currentTarget.value === 'series') {
												project.updateAnnotation(item.id, {
													positionBy: 'series',
													series: project.orderedSeriesNames[0] ?? null
												});
											} else {
												project.updateAnnotation(item.id, { positionBy: 'y', series: null });
											}
										}}
										class={CONTROL_CLASS}
									>
										<option value="y">Y value</option>
										<option value="series">Series</option>
									</select>
								</ControlInput>

								{#if item.positionBy === 'series'}
									<ControlInput label="Series">
										<select
											value={item.series ?? ''}
											onchange={(event) =>
												project.updateAnnotation(item.id, {
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
								{:else}
									<ControlInput label="Y value">
										<input
											type="number"
											value={item.y}
											oninput={(event) =>
												project.updateAnnotation(item.id, { y: event.currentTarget.value })}
											placeholder="0"
											class={CONTROL_CLASS}
										/>
									</ControlInput>
								{/if}

								<ControlInput label="Axis">
									<select
										value={item.axis}
										onchange={(event) =>
											project.updateAnnotation(item.id, {
												axis: /** @type {'left' | 'right'} */ (event.currentTarget.value)
											})}
										class={CONTROL_CLASS}
									>
										<option value="left">Left</option>
										<option value="right">Right</option>
									</select>
								</ControlInput>
							{/if}
							{#if item.type === 'rule' || item.type === 'point'}
								<div class="flex items-center gap-3 pt-3">
									<p
										class="mb-0 shrink-0 font-space text-xxs font-medium uppercase tracking-wider text-dark-grey"
									>
										Appearance
									</p>
									<span
										class="flex-1 border-t border-dashed border-mid-warm-grey"
										aria-hidden="true"
									></span>
								</div>

								<ControlInput
									label={item.type === 'rule' ? 'Rule line colour' : 'Point dot colour'}
								>
									<ColourPicker
										value={item.type === 'rule' ? appearance.ruleColour : appearance.pointColour}
										onChange={(colour) =>
											setStyle(item, item.type === 'rule' ? 'ruleColour' : 'pointColour', colour)}
									/>
									<span class="truncate font-mono text-xs text-mid-grey">
										{item.type === 'rule' ? appearance.ruleColour : appearance.pointColour}
									</span>
								</ControlInput>
								<ControlInput label="Label colour">
									<ColourPicker
										value={appearance.labelColour}
										onChange={(colour) => setStyle(item, 'labelColour', colour)}
									/>
									<span class="truncate font-mono text-xs text-mid-grey">
										{appearance.labelColour}
									</span>
								</ControlInput>
								<ControlInput label="Line style">
									<select
										value={appearance.lineStyle}
										onchange={(event) => setStyle(item, 'lineStyle', event.currentTarget.value)}
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
										value={appearance.lineWidth}
										oninput={(event) =>
											setNumericStyle(item, 'lineWidth', event.currentTarget.value, 0, 10)}
										class={NUMBER_CLASS}
									/>
								</ControlInput>
								<ControlInput label="Label size" suffix="px">
									<input
										type="number"
										min="6"
										max="32"
										step="1"
										value={appearance.fontSize}
										oninput={(event) =>
											setNumericStyle(item, 'fontSize', event.currentTarget.value, 6, 32)}
										class={NUMBER_CLASS}
									/>
								</ControlInput>
								<ControlInput label="Label weight">
									<select
										value={appearance.fontWeight}
										onchange={(event) => setStyle(item, 'fontWeight', event.currentTarget.value)}
										class={CONTROL_CLASS}
									>
										<option value="normal">Normal</option>
										<option value="bold">Bold</option>
									</select>
								</ControlInput>
								<ControlInput label="Label max width" suffix="px">
									<input
										type="number"
										min="60"
										max="480"
										step="10"
										value={appearance.labelMaxWidth}
										oninput={(event) =>
											setNumericStyle(item, 'labelMaxWidth', event.currentTarget.value, 60, 480)}
										class={NUMBER_CLASS}
									/>
								</ControlInput>
								{#if item.type === 'point'}
									<ControlInput label="Point radius" suffix="px">
										<input
											type="number"
											min="1"
											max="30"
											step="1"
											value={appearance.pointRadius}
											oninput={(event) =>
												setNumericStyle(item, 'pointRadius', event.currentTarget.value, 1, 30)}
											class={NUMBER_CLASS}
										/>
									</ControlInput>
								{/if}
							{/if}
						{/if}
					</div>
				</div>
			{/each}

			<div class="border-t border-warm-grey pt-3">
				<StratifyButton onclick={() => project.addAnnotation()}>
					<Plus size={14} />
					Add annotation
				</StratifyButton>
			</div>
		{/if}

		{#each project.annotationErrors as error (error)}
			<p class="mb-0 text-xs text-dark-red">{error}</p>
		{/each}
		{#each project.annotationWarnings as warning (warning)}
			<p class="mb-0 text-xs text-amber-700">{warning}</p>
		{/each}
	</div>
</SectionHeader>
