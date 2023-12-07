<script type="ts">
	import { PortableText } from '@portabletext/svelte';
	import Image from '$lib/components/text-components/Image.svelte';

	export let content = null;
	let values = [];
	let current = [];

	content.forEach((block) => {
		if (block._type === 'image' && block.style === 'wide') {
			if (current.length !== 0) {
				values.push({
					type: 'narrow',
					blocks: [...current]
				});
			}

			values.push({
				type: 'wide',
				blocks: [block]
			});

			current = [];
		} else {
			current.push(block);
		}
	});

	values.push([...current]);
	const components = { types: { image: Image } };
</script>

{#if content}
	{#each values as value}
		<div class={`mx-auto max-w-5xl ${value.type === 'wide' ? 'full-width-image' : ''}`}>
			<PortableText value={value.blocks} {components} />
		</div>
	{/each}
{/if}

<style>
	.full-width-image {
		max-width: 100%;
	}
</style>
