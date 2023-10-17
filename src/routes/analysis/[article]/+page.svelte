<script>
	import { PortableText, toPlainText } from '@portabletext/svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>


<h1>{data.title}</h1>
<PortableText value={data.content} components={{}} />