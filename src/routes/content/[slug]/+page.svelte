<script>
	import Meta from '$lib/components/Meta.svelte';
	import RichText from '$lib/components/text-components/RichText.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();
</script>

<Meta title={data.title} image="/img/preview.jpg" />

<div class="container lg:container py-12">
	<header class="mx-auto max-w-5xl py-16">
		<h1>{data.title}</h1>
	</header>
	{#if data.content}
		<RichText content={data.content} />
	{/if}
</div>
