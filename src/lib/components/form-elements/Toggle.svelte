<script>
	export let checked = false;

	$: background = checked ? 'bg-dark-grey' : 'bg-warm-grey';
	$: position = checked ? 'translate-x-3' : '-translate-x-3';
	$: crossfade = checked ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in';
	$: checkfade = checked ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out';
</script>

<label for="toggle" class="flex gap-6 justify-center items-center">
	<span class="font-space text-sm">Table</span>

	<!-- Enabled: "bg-indigo-600", Not Enabled: "bg-gray-200" -->
	<button
		on:click
		type="button"
		class="{background} relative inline-flex h-10 w-16 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-dark-grey focus:ring-offset-2"
		role="switch"
		aria-checked="false"
		name="toggle"
	>
		<span class="sr-only">Use setting</span>
		<!-- Enabled: "translate-x-5", Not Enabled: "translate-x-0" -->
		<span
			class="{position} pointer-events-none relative inline-block h-8 w-8 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
		>
			<!-- Enabled: "opacity-0 duration-100 ease-out", Not Enabled: "opacity-100 duration-200 ease-in" -->
			<span
				class="{crossfade} absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
				aria-hidden="true"
			>
				<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 12 12">
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
				<svg class="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
					<path
						d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z"
					/>
				</svg>
			</span>
		</span>
	</button>
</label>
