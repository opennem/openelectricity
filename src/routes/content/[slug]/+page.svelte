<script>
	import { PortableText } from '@portabletext/svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div class="container max-w-none lg:container py-12">
	<div class="">
		<h1>{data.title}</h1>
		<PortableText value={data.content} components={{}} />
	</div>
</div>
