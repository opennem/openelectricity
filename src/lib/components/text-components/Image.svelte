<script lang="ts">
	import { urlFor } from '$lib/sanity';
	// import type { CustomBlockComponentProps } from '@portabletext/svelte';

	// Property custom blocks receive from @portabletext/svelte when redered
	/** @type {import('@portabletext/svelte').CustomBlockComponentProps} */
	export let portableText;
	// let imageWidth = portableText.value.style === 'content' ? 1024 : 1440;

	// console.log(portableText.value);
</script>

<figure class="py-12 my-12">
	<img
		class="border rounded-xl shadow-lg"
		src={urlFor(portableText.value).width(2000).url()}
		alt={portableText.value.alt}
	/>

	{#if portableText.value.alt}
		<figcaption class="w-3/4 mx-auto font-space text-xs font-medium text-mid-grey mt-6">
			{portableText.value.alt}
		</figcaption>
	{/if}
</figure>
