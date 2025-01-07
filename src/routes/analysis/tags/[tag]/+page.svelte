<script>
	let { data } = $props();
</script>

<div class="container max-w-none lg:container py-12">
	<h1 class="text-3xl font-bold">Articles for tag <em>{data.title}</em></h1>
	<div class="grid grid-cols-3 py-12">
		{#each data.articles as { title, slug }}
			<div>
				<h3 class="text-3xl font-bold">{title}</h3>
				<a href="/analysis/{slug.current}">Read more</a>
			</div>
		{/each}
	</div>
</div>
