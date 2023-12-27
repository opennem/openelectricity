<script>
	import RichText from '$lib/components/text-components/RichText.svelte';
	import { urlFor } from '$lib/sanity';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div class="container max-w-none lg:container py-12">
	<header class="">
		<h1>{data.title}</h1>
		<div>
			{#if data.author}
				{data.author.name}
				<img src={urlFor(data.author.image).width(200).url()} alt={data.author.image.alt} />
			{/if}
		</div>
	</header>
	{#if data.content}
		<RichText content={data.content} />
	{/if}
</div>
