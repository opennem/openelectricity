<script>
	import Meta from '$lib/components/Meta.svelte';
	import RichText from '$lib/components/text-components/RichText.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<Meta
	title={data.title}
	description="Open Electricity is a platform for exploring Australia's electricity system."
	image="/img/preview.jpg"
/>

<div class="container lg:container py-12">
	<header class="mx-auto max-w-5xl py-16">
		<h1>{data.title}</h1>
	</header>
	{#if data.content}
		<RichText content={data.content} />
	{/if}
</div>
