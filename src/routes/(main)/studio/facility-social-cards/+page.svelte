<script>
	import Meta from '$lib/components/Meta.svelte';

	/** @type {{ data: { facilities: { code: string, name: string, network_region: string, hasPhoto: boolean }[] } }} */
	let { data } = $props();

	let query = $state('');
	/** @type {'all' | 'photo' | 'fallback'} */
	let kind = $state('all');

	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return data.facilities.filter((f) => {
			const matchesText =
				!q || f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
			const matchesKind = kind === 'all' || (kind === 'photo' ? f.hasPhoto : !f.hasPhoto);
			return matchesText && matchesKind;
		});
	});

	let photoCount = $derived(data.facilities.filter((f) => f.hasPhoto).length);
</script>

<Meta
	title="Facility Social Cards"
	description="Preview of the build-generated Open Graph cards for every facility."
	image="/img/preview.jpg"
/>

<div class="min-h-screen bg-light-warm-grey">
	<header
		class="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-mid-warm-grey/40 bg-white px-6 py-4"
	>
		<h1 class="m-0 text-lg font-semibold text-dark-grey">Facility Social Cards</h1>
		<span class="text-sm text-mid-grey">
			{filtered.length} of {data.facilities.length} · {photoCount} with photo · {data.facilities
				.length - photoCount} fallback
		</span>

		<div class="ml-auto flex items-center gap-3">
			<div class="flex overflow-hidden rounded-full border border-mid-warm-grey/50 text-xs">
				{#each [['all', 'All'], ['photo', 'Photo'], ['fallback', 'Fallback']] as [value, label] (value)}
					<button
						type="button"
						class="px-3 py-1.5 transition-colors {kind === value
							? 'bg-dark-grey text-white'
							: 'bg-white text-dark-grey hover:bg-light-warm-grey'}"
						onclick={() => (kind = /** @type {'all' | 'photo' | 'fallback'} */ (value))}
					>
						{label}
					</button>
				{/each}
			</div>
			<input
				type="search"
				bind:value={query}
				placeholder="Filter by name or code…"
				class="w-64 rounded-md border border-mid-warm-grey/50 px-3 py-1.5 text-sm focus:border-dark-grey focus:outline-none"
			/>
		</div>
	</header>

	<main
		class="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
	>
		{#each filtered as f (f.code)}
			<figure class="m-0 overflow-hidden rounded-lg border border-mid-warm-grey/40 bg-white">
				<a href="/facility/{f.code}" class="block">
					<img
						src="/og/facility/{f.code}.jpg"
						alt="Social card for {f.name}"
						loading="lazy"
						width="1200"
						height="630"
						class="block aspect-[1200/630] w-full bg-light-warm-grey object-cover"
					/>
				</a>
				<figcaption class="flex items-center justify-between gap-2 px-3 py-2">
					<span class="truncate text-sm font-medium text-dark-grey" title={f.name}>{f.name}</span>
					<span
						class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {f.hasPhoto
							? 'bg-success-green/15 text-success-green'
							: 'bg-mid-warm-grey/30 text-mid-grey'}"
					>
						{f.code}
					</span>
				</figcaption>
			</figure>
		{/each}
	</main>

	{#if filtered.length === 0}
		<p class="px-6 pb-12 text-center text-sm text-mid-grey">No facilities match your filter.</p>
	{/if}
</div>
