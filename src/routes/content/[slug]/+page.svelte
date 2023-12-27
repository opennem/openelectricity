<script>
	import RichText from '$lib/components/text-components/RichText.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div class="container max-w-none lg:container py-12">
	<div class="max-w-5xl mx-auto">
		<header class="">
			<h1>{data.title}</h1>
			<RichText content={data.content} />
		</header>
	</div>
</div>
