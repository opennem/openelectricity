<script>
	import { Sliders, X } from '@lucide/svelte';
	import { DEFAULT_TUNING } from '../_utils/map-tuning.js';

	/**
	 * @typedef {import('../_utils/map-tuning.js').Tuning} Tuning
	 *
	 * @typedef {{
	 *   key: keyof Tuning,
	 *   label: string,
	 *   type?: 'range' | 'select' | 'toggle',
	 *   min?: number,
	 *   max?: number,
	 *   step?: number,
	 *   unit?: string,
	 *   format?: (n: number) => string,
	 *   options?: Array<{ value: number, label: string }>
	 * }} Field
	 *
	 * @type {{
	 *   tuning: Tuning,
	 *   markerStyle: 'circles' | 'hex' | 'heatmap'
	 * }}
	 */
	let { tuning = $bindable(), markerStyle } = $props();

	let open = $state(false);

	/** @type {Field[]} */
	const CIRCLE_FIELDS = [
		{ key: 'circleMin', label: 'Min radius', type: 'range', min: 1, max: 20, step: 1, unit: 'px' },
		{ key: 'circleMax', label: 'Max radius', type: 'range', min: 5, max: 60, step: 1, unit: 'px' }
	];

	/** @type {Field[]} */
	const HEX_FIELDS = [
		{ key: 'hexRadius', label: 'Column radius', type: 'range', min: 1000, max: 20000, step: 500, unit: 'm' },
		{ key: 'hexElevationScale', label: 'Height scale', type: 'range', min: 50, max: 800, step: 10, unit: '×' },
		{
			key: 'hexDiskResolution',
			label: 'Shape',
			type: 'select',
			options: [
				{ value: 3, label: 'Triangle' },
				{ value: 4, label: 'Square' },
				{ value: 6, label: 'Hexagon' },
				{ value: 8, label: 'Octagon' },
				{ value: 32, label: 'Circle' }
			]
		},
		{
			key: 'hexBrightMix',
			label: 'Brighten',
			type: 'range',
			min: 0,
			max: 1,
			step: 0.05,
			format: (n) => n.toFixed(2)
		},
		{ key: 'hexFillAlpha', label: 'Fill opacity', type: 'range', min: 0, max: 255, step: 5 },
		{
			key: 'hexGlowRadiusMultiplier',
			label: 'Glow size',
			type: 'range',
			min: 1,
			max: 5,
			step: 0.1,
			unit: '×',
			format: (n) => n.toFixed(1)
		},
		{ key: 'hexGlowAlpha', label: 'Glow opacity', type: 'range', min: 0, max: 255, step: 5 },
		{ key: 'hexOutlineAlpha', label: 'Outline opacity', type: 'range', min: 0, max: 255, step: 5 },
		{ key: 'hexExtruded', label: 'Extruded (3D)', type: 'toggle' },
		{ key: 'hexMaterial', label: 'PBR lighting', type: 'toggle' }
	];

	/** @type {Field[]} */
	const HEATMAP_FIELDS = [
		{ key: 'heatmapRadius', label: 'Blob radius', type: 'range', min: 20, max: 200, step: 5, unit: 'px' },
		{
			key: 'heatmapIntensity',
			label: 'Intensity',
			type: 'range',
			min: 0.1,
			max: 5,
			step: 0.1,
			unit: '×',
			format: (n) => n.toFixed(1)
		},
		{
			key: 'heatmapThreshold',
			label: 'Threshold',
			type: 'range',
			min: 0,
			max: 0.1,
			step: 0.005,
			format: (n) => n.toFixed(3)
		},
		{ key: 'heatmapDebounce', label: 'Debounce', type: 'range', min: 0, max: 1000, step: 50, unit: 'ms' },
		{
			key: 'heatmapTextureSize',
			label: 'Texture size',
			type: 'select',
			unit: 'px',
			options: [
				{ value: 128, label: '128' },
				{ value: 256, label: '256' },
				{ value: 512, label: '512' },
				{ value: 1024, label: '1024' },
				{ value: 2048, label: '2048' }
			]
		}
	];

	/** @type {Record<'circles' | 'hex' | 'heatmap', Field[]>} */
	const FIELDS_BY_STYLE = {
		circles: CIRCLE_FIELDS,
		hex: HEX_FIELDS,
		heatmap: HEATMAP_FIELDS
	};
	/** @type {Record<'circles' | 'hex' | 'heatmap', string>} */
	const TITLE_BY_STYLE = {
		circles: 'Tune circles',
		hex: 'Tune hex',
		heatmap: 'Tune heatmap'
	};

	let activeFields = $derived(FIELDS_BY_STYLE[markerStyle]);
	let title = $derived(TITLE_BY_STYLE[markerStyle]);

	function reset() {
		Object.assign(tuning, DEFAULT_TUNING);
	}
</script>

<div class="absolute bottom-4 left-4 z-30 select-none">
	{#if open}
		<div class="bg-white border border-warm-grey rounded-lg shadow-lg w-64 text-xs flex flex-col max-h-[70vh]">
			<header class="flex items-center justify-between px-3 py-2 border-b border-warm-grey shrink-0">
				<span class="font-medium text-dark-grey">{title}</span>
				<button
					class="text-mid-grey hover:text-dark-grey transition-colors"
					onclick={() => (open = false)}
					aria-label="Close tuning panel"
				>
					<X size={14} />
				</button>
			</header>

			<div class="flex flex-col gap-3 px-3 py-3 overflow-y-auto">
				{#each activeFields as field (field.key)}
					{@const raw = tuning[field.key]}
					{#if field.type === 'toggle'}
						<label class="flex items-center justify-between gap-2 cursor-pointer">
							<span class="text-mid-grey">{field.label}</span>
							<input
								type="checkbox"
								checked={/** @type {boolean} */ (raw)}
								onchange={(e) => {
									/** @type {any} */ (tuning)[field.key] =
										/** @type {HTMLInputElement} */ (e.currentTarget).checked;
								}}
								class="accent-chart-1"
							/>
						</label>
					{:else if field.type === 'select'}
						{@const numeric = /** @type {number} */ (raw)}
						<label class="flex flex-col gap-1">
							<span class="flex items-center justify-between text-mid-grey">
								<span>{field.label}</span>
								{#if field.unit}<span class="font-mono text-dark-grey">{numeric} {field.unit}</span>{/if}
							</span>
							<select
								class="border border-warm-grey rounded px-2 py-1 bg-white text-dark-grey"
								value={numeric}
								onchange={(e) => {
									/** @type {any} */ (tuning)[field.key] = Number(
										/** @type {HTMLSelectElement} */ (e.currentTarget).value
									);
								}}
							>
								{#each field.options ?? [] as opt (opt.value)}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</label>
					{:else}
						{@const numeric = /** @type {number} */ (raw)}
						{@const display = field.format ? field.format(numeric) : String(numeric)}
						<label class="flex flex-col gap-1">
							<span class="flex items-center justify-between text-mid-grey">
								<span>{field.label}</span>
								<span class="font-mono text-dark-grey">
									{display}{field.unit ? ` ${field.unit}` : ''}
								</span>
							</span>
							<input
								type="range"
								min={field.min}
								max={field.max}
								step={field.step}
								value={numeric}
								oninput={(e) => {
									/** @type {any} */ (tuning)[field.key] = Number(
										/** @type {HTMLInputElement} */ (e.currentTarget).value
									);
								}}
								class="w-full accent-chart-1"
							/>
						</label>
					{/if}
				{/each}
			</div>

			<footer class="flex justify-end px-3 py-2 border-t border-warm-grey shrink-0">
				<button
					class="text-mid-grey hover:text-dark-grey transition-colors"
					onclick={reset}
				>
					Reset
				</button>
			</footer>
		</div>
	{:else}
		<button
			class="bg-white border-2 border-warm-grey rounded-lg p-2 shadow hover:bg-light-warm-grey transition-colors"
			onclick={() => (open = true)}
			aria-label="Open marker tuning panel"
			title="Tune marker style"
		>
			<Sliders size={16} class="text-dark-grey" />
		</button>
	{/if}
</div>
