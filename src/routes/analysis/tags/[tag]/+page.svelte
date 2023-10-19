<script>
	export let data;
</script>

<h1 class="text-3xl font-bold">Articles for tag <em>{data.title}</em></h1>
<div>
	{#each data.articles as { title, slug }}
        <div>
            <h3 class="text-3xl font-bold">{title}</h3>
            <a href="/analysis/{slug.current}">Read more</a>
        </div>
	{/each}
</div>