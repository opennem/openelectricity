<script>
	import { sortByProp } from '$lib/utils/sort.js';

	/** @type {import('./$types').PageData} */
	export let data;

	$: sortedFacilities = data.facilities.sort(sortByProp('name'));
</script>

<h1 class="text-3xl font-bold">Sitemap</h1>

<h3 class="text-xl border-b font-semibold mt-6">Articles</h3>
<ul class="list-disc pl-6">
	{#each data.articles as { title, slug }}
		<li>
			<a class="text-slate-500 text-sm hover:underline" href="/analysis/{slug.current}">{title}</a>
		</li>
	{/each}
</ul>

<h3 class="text-xl border-b font-semibold mt-6">Tags</h3>
<ul class="list-disc pl-6">
	{#each data.tags as { title, slug }}
		<li>
			<a class="text-slate-500 text-sm hover:underline" href="/analysis/tags/{slug.current}"
				>{title}</a
			>
		</li>
	{/each}
</ul>

<h3 class="text-xl border-b font-semibold mt-6">Facilities</h3>
<ul class="list-disc pl-6">
	{#each sortedFacilities as { name, code }}
		<li><a class="text-slate-500 text-sm hover:underline" href="/facility/{code}">{name}</a></li>
	{/each}
</ul>
