<script>
	import { PortableText } from '@portabletext/svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div class="container mx-auto py-12">
	<div class="max-w-[66%]">
		<h1>{data.title}</h1>
		<PortableText value={data.content} components={{}} />
	</div>
</div>
