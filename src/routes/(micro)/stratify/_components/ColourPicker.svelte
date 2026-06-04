<script>
	import { getStratifyContext } from '../_state/context.js';
	import { getPaletteSwatchColours } from '$lib/stratify/colour-palettes.js';

	/**
	 * Theme-aware colour picker: a swatch trigger opening a popover with the
	 * selected palette's swatches, a native picker, a hex field, and an optional
	 * reset. Shared by the Series panel and the map colour controls.
	 *
	 * @type {{
	 *   value: string,
	 *   onChange: (colour: string) => void,
	 *   hasOverride?: boolean,
	 *   onReset?: () => void
	 * }}
	 */
	let { value, onChange, hasOverride = false, onReset } = $props();

	const project = getStratifyContext();
	const swatches = $derived(getPaletteSwatchColours(project.colourPalette));

	let open = $state(false);
	/** @type {HTMLElement | undefined} */
	let root;

	/** @param {string} raw */
	function setHex(raw) {
		const v = raw.trim();
		if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) || /^rgba?\(/.test(v)) {
			onChange(v);
		}
	}

	// Close on outside click / Escape — only while open (one listener at a time).
	$effect(() => {
		if (!open) return;
		/** @param {MouseEvent} e */
		const onDocClick = (e) => {
			if (root && !root.contains(/** @type {Node} */ (e.target))) open = false;
		};
		/** @param {KeyboardEvent} e */
		const onKey = (e) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="relative inline-flex shrink-0" bind:this={root}>
	<button
		type="button"
		onclick={() => (open = !open)}
		class="w-4 h-4 shrink-0 rounded-sm border {open
			? 'border-dark-grey ring-1 ring-dark-grey/20'
			: 'border-mid-warm-grey'}"
		style="background-color: {value || '#ccc'};"
		title="Pick colour"
		aria-label="Pick colour"
	></button>

	{#if open}
		<div
			class="absolute left-0 top-6 z-20 w-44 p-2.5 bg-white border border-warm-grey rounded-lg shadow-md"
		>
			<!-- Preset palette swatches -->
			<div class="flex flex-wrap gap-1 mb-2">
				{#each swatches as colour, i (colour + i)}
					<button
						type="button"
						onclick={() => onChange(colour)}
						class="w-5 h-5 rounded-sm border {value === colour
							? 'border-dark-grey ring-1 ring-dark-grey/30'
							: 'border-mid-warm-grey/50 hover:border-mid-warm-grey'}"
						style="background-color: {colour};"
						title={colour}
						aria-label={`Use ${colour}`}
					></button>
				{/each}
			</div>

			<!-- Native colour picker + hex input -->
			<div class="flex items-center gap-1.5">
				<input
					type="color"
					value={value?.startsWith('#') ? value.slice(0, 7) : '#000000'}
					oninput={(e) => onChange(e.currentTarget.value)}
					class="w-6 h-6 rounded border border-warm-grey cursor-pointer p-0"
					title="Colour picker"
				/>
				<input
					type="text"
					{value}
					oninput={(e) => setHex(e.currentTarget.value)}
					placeholder="#hex or rgba(...)"
					class="flex-1 min-w-0 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-dark-grey"
				/>
				{#if hasOverride && onReset}
					<button
						type="button"
						onclick={onReset}
						class="shrink-0 text-[10px] text-mid-grey hover:text-dark-grey"
						title="Reset to preset colour"
					>
						Reset
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
