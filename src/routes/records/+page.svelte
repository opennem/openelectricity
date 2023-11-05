<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div>
	<div class="container max-w-none lg:container py-12">
		<h1>Records</h1>
		{#each data.records as { description }}
			<h3>{description}</h3>
		{/each}
	</div>
</div>
