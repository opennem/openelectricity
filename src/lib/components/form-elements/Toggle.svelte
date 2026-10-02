<script>
	/**
	 * @typedef {Object} Props
	 * @property {boolean} [checked]
	 * @property {string} [label]
	 * @property {(event: MouseEvent) => void} [onclick]
	 * @property {boolean} [disabled] - Greyed out and inert (the option doesn't apply)
	 * @property {boolean} [compact] - Toolbar size, beside compact filter pills:
	 *   a 20 × 34px switch and the pills' text-xs label
	 */

	/** @type {Props} */
	let { checked = false, label = 'Table', onclick, disabled = false, compact = false } = $props();
	const id = $props.id();

	/** Each size's label, track, knob (and its travel) and icon. */
	const SIZES = {
		regular: {
			label: 'gap-6 font-space text-sm',
			track: 'h-10 w-16',
			knob: 'h-8 w-8',
			on: 'translate-x-3',
			off: '-translate-x-3',
			icon: 'h-6 w-6'
		},
		compact: {
			label: 'gap-2 text-xs font-medium text-dark-grey',
			track: 'h-[20px] w-[34px]',
			knob: 'size-[16px]',
			on: 'translate-x-[7px]',
			off: '-translate-x-[7px]',
			icon: 'size-[10px]'
		}
	};
	let size = $derived(SIZES[compact ? 'compact' : 'regular']);

	let background = $derived(checked ? 'bg-dark-grey' : 'bg-warm-grey');
	let position = $derived(checked ? size.on : size.off);
	let crossfade = $derived(
		checked ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'
	);
	let checkfade = $derived(
		checked ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'
	);
</script>

<label
	for={id}
	class="flex justify-center items-center {size.label} {disabled
		? 'cursor-not-allowed opacity-40'
		: ''}"
>
	<span>{label}</span>

	<!-- Enabled: "bg-indigo-600", Not Enabled: "bg-gray-200" -->
	<button
		{onclick}
		{id}
		{disabled}
		type="button"
		class="{background} relative inline-flex {size.track} shrink-0 {disabled
			? 'cursor-not-allowed'
			: 'cursor-pointer'} items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden"
		role="switch"
		aria-checked={checked}
		name="toggle"
	>
		<span class="sr-only">{label}</span>
		<!-- Enabled: "translate-x-5", Not Enabled: "translate-x-0" -->
		<span
			class="{position} pointer-events-none relative inline-block {size.knob} transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
		>
			<!-- Enabled: "opacity-0 duration-100 ease-out", Not Enabled: "opacity-100 duration-200 ease-in" -->
			<span
				class="{crossfade} absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
				aria-hidden="true"
			>
				<svg class="{size.icon} text-gray-400" fill="none" viewBox="0 0 12 12">
					<path
						d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>
			<!-- Enabled: "opacity-100 duration-200 ease-in", Not Enabled: "opacity-0 duration-100 ease-out" -->
			<span
				class="{checkfade} absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
				aria-hidden="true"
			>
				<svg class="{size.icon} text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
					<path
						d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z"
					/>
				</svg>
			</span>
		</span>
	</button>
</label>
