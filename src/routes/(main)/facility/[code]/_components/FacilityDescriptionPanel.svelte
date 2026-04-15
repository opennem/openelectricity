<script>
	import { ExternalLink, X } from '@lucide/svelte';
	import { urlFor } from '$lib/sanity';

	/**
	 * @type {{
	 *   sanityFacility: any | null,
	 *   onclose?: () => void
	 * }}
	 */
	let { sanityFacility, onclose } = $props();

	/**
	 * @param {any[] | undefined} blocks
	 * @returns {string[]}
	 */
	function extractParagraphs(blocks) {
		if (!blocks?.length) return [];
		return blocks
			.filter((/** @type {any} */ b) => b._type === 'block')
			.map(
				(/** @type {any} */ b) =>
					b.children?.map((/** @type {any} */ c) => c.text).join('') || ''
			)
			.filter(Boolean);
	}

	let paragraphs = $derived(extractParagraphs(sanityFacility?.description));
	let photos = $derived(sanityFacility?.photos ?? []);
	let owners = $derived(sanityFacility?.owners ?? []);
	let hasContent = $derived(paragraphs.length > 0 || photos.length > 0 || owners.length > 0);
</script>

<div class="flex flex-col h-full">
	<header class="shrink-0 flex items-center justify-between px-5 py-3 border-b border-warm-grey bg-light-warm-grey/40">
		<h3 class="text-xs uppercase tracking-widest text-mid-grey m-0">About</h3>
		{#if onclose}
			<button
				onclick={onclose}
				class="p-1.5 rounded-lg hover:bg-warm-grey transition-colors text-mid-grey hover:text-dark-grey cursor-pointer"
				aria-label="Close description"
			>
				<X size={16} />
			</button>
		{/if}
	</header>

	<div class="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
		{#if !hasContent}
			<p class="text-sm text-mid-grey">No description available.</p>
		{:else}
			{#if photos.length > 0}
				{@const hero = photos[0]}
				<figure class="m-0">
					<img
						src={hero.asset ? urlFor(hero).width(640).url() : hero.url}
						alt={hero.alt || hero.caption || sanityFacility?.name || 'Facility photo'}
						class="w-full h-auto rounded-lg border border-warm-grey object-cover"
					/>
					{#if hero.caption || hero.attribution}
						<figcaption class="text-xxs text-mid-grey mt-1.5">
							{hero.caption ?? ''}{#if hero.attribution}{hero.caption ? ' — ' : ''}{hero.attribution}{/if}
						</figcaption>
					{/if}
				</figure>
			{/if}

			{#if paragraphs.length > 0}
				<div class="text-sm text-dark-grey leading-relaxed space-y-3">
					{#each paragraphs as text, i (i)}
						<p class="m-0">{text}</p>
					{/each}
				</div>
			{/if}

			{#if owners.length > 0}
				<div>
					<h4 class="text-xxs uppercase tracking-widest text-mid-grey mb-2 m-0">Owners</h4>
					<ul class="list-none p-0 m-0 space-y-1">
						{#each owners as owner (owner._id)}
							<li>
								{#if owner.website}
									<a
										href={owner.website}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm text-dark-grey hover:text-black inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:decoration-solid"
									>
										{owner.name || owner.legal_name}<ExternalLink size={12} class="shrink-0" />
									</a>
								{:else}
									<span class="text-sm text-dark-grey">{owner.name || owner.legal_name}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	</div>
</div>
