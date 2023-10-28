<script>
	export let data;
	const articles = data.articles;
</script>

<div class="container mx-auto py-12">
	<h1>Analysis</h1>
	<div class="grid grid-cols-3 py-12">
		{#each articles as { title, slug }}
			<div>
				<h3>{title}</h3>
				<a href="/analysis/{slug.current}">Read more</a>
			</div>
		{/each}
	</div>
</div>
