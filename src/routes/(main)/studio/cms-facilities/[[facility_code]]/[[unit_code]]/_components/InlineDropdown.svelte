<script>
	import { onMount } from 'svelte';

	let {
		options = [],
		selected = null,
		placeholder = 'Select...',
		onselect,
		disabled = false
	} = $props();

	let open = $state(false);
	let search = $state('');
	/** @type {HTMLDivElement | null} */
	let containerEl = $state(null);
	/** @type {HTMLInputElement | null} */
	let searchInputEl = $state(null);

	let filteredOptions = $derived(
		search
			? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
			: options
	);

	let selectedLabel = $derived(options.find((o) => o.value === selected)?.label ?? null);

	$effect(() => {
		if (!open) {
			search = '';
		}
	});

	$effect(() => {
		if (open && searchInputEl) {
			searchInputEl.focus();
		}
	});

	onMount(() => {
		/** @param {MouseEvent} e */
		function handleClickOutside(e) {
			if (containerEl && !containerEl.contains(/** @type {Node} */ (e.target))) {
				open = false;
			}
		}

		document.addEventListener('click', handleClickOutside, true);

		return () => {
			document.removeEventListener('click', handleClickOutside, true);
		};
	});

	/**
	 * @param {string} value
	 */
	function selectOption(value) {
		onselect?.(value);
		open = false;
	}
</script>

<div class="relative inline-block" bind:this={containerEl}>
	<button
		type="button"
		class="inline-flex items-center gap-1 border border-warm-grey rounded px-1.5 py-0.5 font-mono text-[11px] text-dark-grey hover:border-dark-grey disabled:opacity-50 transition-colors"
		{disabled}
		onclick={() => {
			if (!disabled) open = !open;
		}}
	>
		<span class={selectedLabel ? '' : 'text-mid-grey'}>
			{selectedLabel ?? placeholder}
		</span>

		<svg
			class="h-2.5 w-2.5 shrink-0 text-mid-grey transition-transform {open
				? 'rotate-180'
				: ''}"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M4 6l4 4 4-4" />
		</svg>
	</button>

	{#if open}
		<div
			class="absolute left-0 top-full z-10 mt-1 min-w-[160px] overflow-hidden rounded border border-warm-grey bg-white shadow-sm"
		>
			<input
				bind:this={searchInputEl}
				bind:value={search}
				type="text"
				placeholder="Search..."
				class="w-full border-b border-warm-grey px-2 py-1.5 font-mono text-[11px] focus:outline-none"
			/>

			<div class="max-h-[200px] overflow-y-auto">
				{#each filteredOptions as option (option.value)}
					<button
						type="button"
						class="w-full cursor-pointer px-2 py-1.5 text-left font-mono text-[11px] hover:bg-warm-grey/50 {option.value === selected ? 'bg-warm-grey/30' : ''}"
						onclick={() => selectOption(option.value)}
					>
						{option.label}
					</button>
				{:else}
					<div class="px-2 py-1.5 font-mono text-[11px] text-mid-grey">No results</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
