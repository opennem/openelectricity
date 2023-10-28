<script>
	import { byProp } from '$lib/utils/sort.js';

	/** @type {import('./$types').PageData} */
	export let data;

	$: sortedFacilities = data.facilities.sort(byProp('name'));
</script>

<div class="container mx-auto">
	<h1>Sitemap</h1>

	<h3>Articles</h3>
	<ul class="list-disc pl-6">
		{#each data.articles as { title, slug }}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/analysis/{slug.current}">{title}</a
				>
			</li>
		{/each}
	</ul>

	<h3>Tags</h3>
	<ul class="list-disc pl-6">
		{#each data.tags as { title, slug }}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/analysis/tags/{slug.current}"
					>{title}</a
				>
			</li>
		{/each}
	</ul>

	<h3 class="text-xl border-b font-semibold mt-6">Content Pages</h3>
	<ul class="list-disc pl-6">
		{#each data.contentPages as { title, slug }}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/content/{slug.current}">{title}</a>
			</li>
		{/each}
	</ul>

	<h3 class="text-xl border-b font-semibold mt-6">{sortedFacilities.length} Facilities</h3>
	<ul class="list-disc pl-6">
		{#each sortedFacilities as { name, code }}
			<li>
				<a class="text-slate-500 text-sm hover:underline" href="/facility/{code}">
					{name} <small>({decodeURIComponent(code)})</small>
				</a>
			</li>
		{/each}
	</ul>
</div>
