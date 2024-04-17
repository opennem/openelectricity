<script type="ts">
	import { PortableText } from '@portabletext/svelte';
	import Image from '$lib/components/text-components/Image.svelte';

	export let content = null;
	let values = [];
	let current = [];

	$: {
		values = [];
		current = [];

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
	}
	const components = { types: { image: Image } };

	$: console.log(content);
</script>

{#if content}
	{#each content as value}
		{#if value._type === 'image'}
			<div
				class="mx-auto"
				class:max-w-[800px]={value.style !== 'wide'}
				class:max-w-full={value.style === 'wide'}
			>
				<PortableText value={value.blocks ? value.blocks : value} {components} />
			</div>
		{:else}
			<div
				class="mx-auto max-w-5xl"
				class:blockquote={value.style === 'blockquote'}
				class:border-t={value.style === 'blockquote'}
				class:border-dark-grey={value.style === 'blockquote'}
				class:mt-12={value.style === 'blockquote'}
				class:py-12={value.style === 'blockquote'}
				class:text-2xl={value.style === 'blockquote'}
				class:leading-2xl={value.style === 'blockquote'}
				class:md:text-4xl={value.style === 'blockquote'}
				class:md:leading-4xl={value.style === 'blockquote'}
				class:font-bold={value.style === 'blockquote'}
				class:not-italic={value.style === 'blockquote'}
				class:text-dark-grey={value.style === 'blockquote'}
				class:font-space={value.style === 'blockquote'}
			>
				<PortableText value={value.blocks ? value.blocks : value} {components} />
			</div>
		{/if}
		<!-- <div class={`mx-auto max-w-5xl ${value.type === 'wide' ? 'full-width-image' : ''}`}>
			<PortableText value={value.blocks ? value.blocks : value} {components} />
		</div> -->
	{/each}
{/if}

<style>
	:global(.blockquote em) {
		font-style: normal;
	}
</style>
