<script lang="ts">
	import { urlFor } from '$lib/sanity';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	// Property custom blocks receive from @portabletext/svelte when redered
	export let portableText: CustomBlockComponentProps;
	let imageWidth = portableText.value.style === 'content' ? 1024 : 1440;
</script>

<img src={urlFor(portableText.value).width(imageWidth).url()} alt={portableText.value.alt} />
