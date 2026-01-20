<script>
	import Meta from '$lib/components/Meta.svelte';
	import { byProp } from '$lib/utils/sort.js';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	let sortedFacilities = $derived(data.facilities.sort(byProp('name')));
</script>

<Meta title="Sitemap" image="/img/preview.jpg" />

<div class="container max-w-none lg:container">
	<h1>Sitemap</h1>

	<h3>Articles</h3>
	<ul class="list-disc pl-6">
		{#each data.articles as { title, slug } (slug.current)}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/analysis/{slug.current}">{title}</a
				>
			</li>
		{/each}
	</ul>

	<h3>Tags</h3>
	<ul class="list-disc pl-6">
		{#each data.tags as { title, slug } (slug.current)}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/analysis/tags/{slug.current}"
					>{title}</a
				>
			</li>
		{/each}
	</ul>

	<h3 class="text-xl border-b font-semibold mt-6">Content Pages</h3>
	<ul class="list-disc pl-6">
		{#each data.contentPages as { title, slug } (slug.current)}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/content/{slug.current}">{title}</a>
			</li>
		{/each}
	</ul>

	<h3 class="text-xl border-b font-semibold mt-6">{sortedFacilities.length} Facilities</h3>
	<ul class="list-disc pl-6">
		{#each sortedFacilities as { name, code } (code)}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/facility/{code}">
					{name} <small>({decodeURIComponent(code)})</small>
				</a>
			</li>
		{/each}
	</ul>
</div>
