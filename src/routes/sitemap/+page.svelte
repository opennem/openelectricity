<script>
	export let data;
</script>

<h1 class="text-3xl font-bold">Sitemap</h1>
<ul>
    <h3>Articles</h3>
	{#each data.articles as { title, slug }}
        <li><a href="/analysis/{slug.current}">{title}</a></li>
	{/each}
    <h3>Tags</h3>
	{#each data.tags as { title, slug }}
        <li><a href="/analysis/tags/{slug.current}">{title}</a></li>
	{/each}
    <h3>Facilities</h3>
	{#each data.facilities as { name, code }}
        <li><a href="/facility/{code}">{name}</a></li>
	{/each}
</ul>