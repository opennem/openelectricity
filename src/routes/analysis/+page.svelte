<script>
	export let data;
	const articles = data.articles;
</script>

<div class="container mx-auto py-12">
	<h1 class="text-3xl font-bold">Analysis</h1>
	<div class="grid grid-cols-3 py-12">
		{#each articles as { title, slug }}
			<div>
				<h3 class="text-3xl font-bold">{title}</h3>
				<a href="/analysis/{slug.current}">Read more</a>
			</div>
		{/each}
	</div>
</div>
