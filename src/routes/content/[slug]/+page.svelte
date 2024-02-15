<script>
	import RichText from '$lib/components/text-components/RichText.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	console.log(data);
</script>

<div class="container lg:container py-12">
	<header class="mx-auto max-w-5xl py-16">
		<h1>{data.title}</h1>
	</header>
	{#if data.content}
		<RichText content={data.content} />
	{/if}
</div>
