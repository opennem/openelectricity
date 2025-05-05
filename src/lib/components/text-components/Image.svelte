<script lang="ts">
	import { urlFor } from '$lib/sanity';
	// import type { CustomBlockComponentProps } from '@portabletext/svelte';

	// Property custom blocks receive from @portabletext/svelte when redered

	interface Props {
		portableText: import('@portabletext/svelte').CustomBlockComponentProps;
	}

	let { portableText }: Props = $props();
	// let imageWidth = portableText.value.style === 'content' ? 1024 : 1440;

	let hasImageAsset = $derived(portableText.value.asset);
	let hasImageUrl = $derived(hasImageAsset ? urlFor(portableText.value).width(2000).url() : null);
	let hasStyle = $derived(portableText.value.style);
</script>

<figure class="py-12 my-12">
	{#if hasStyle}
		<img class="border rounded-xl shadow-lg" src={hasImageUrl} alt={portableText.value.alt} />
	{:else}
		<img src={hasImageUrl} alt={portableText.value.alt} />
	{/if}

	{#if portableText.value.alt}
		<figcaption class="mx-auto md:px-32 font-space text-xs font-medium text-mid-grey mt-6">
			{portableText.value.alt}
		</figcaption>
	{/if}
</figure>
