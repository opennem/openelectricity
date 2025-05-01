<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import { Tweet, YouTube } from 'sveltekit-embed';

	import Image from '$lib/components/text-components/Image.svelte';

	/**
	 * @typedef {Object} Block
	 * @property {string} _type
	 * @property {string} [style]
	 * @property {string} [listItem]
	 * @property {Block[]} [blocks]
	 * @property {Array<{_type: string, _key: string, href?: string}>} [markDefs]
	 * @property {Array<{text: string, marks?: string[]}>} [children]
	 */

	/**
	 * @typedef {Object} ContentBlock
	 * @property {'narrow' | 'wide'} type
	 * @property {Block[]} blocks
	 */

	/**
	 * @typedef {Object} Props
	 * @property {Block[]} [content]
	 */

	type Block = {
		_type: string;
		style?: string;
		listItem?: string;
		blocks?: Block[];
		markDefs?: Array<{
			_type: string;
			_key: string;
			href?: string;
		}>;
		children?: Array<{
			text: string;
			marks?: string[];
		}>;
	};

	type ContentBlock = {
		type: 'narrow' | 'wide';
		blocks: Block[];
	};

	/** @type {Props} */
	let { content = null } = $props();
	let values = $state<ContentBlock[]>([]);
	let current = $state<Block[]>([]);

	content.forEach((block: Block) => {
		if (block._type === 'image' && block.style === 'wide') {
			current = [];
		} else {
			current.push(block);
		}
	});

	content.forEach((block: Block) => {
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
		}
	});

	values.push({
		type: 'narrow',
		blocks: [...current]
	});

	const components = { types: { image: Image } };

	/**
	 * Checks if a block contains an X (Twitter) link
	 * @param {Block} block - The block to check
	 * @returns {boolean} True if the block contains an X link
	 */
	function isXLink(block: Block): boolean {
		if (!block.children || !block.markDefs) return false;

		return block.children.some((child: { text: string; marks?: string[] }) => {
			if (!child.marks) return false;
			return child.marks.some((mark: string) => {
				const markDef = block.markDefs?.find((def: { _key: string }) => def._key === mark);
				return (
					markDef?._type === 'link' &&
					(markDef.href?.includes('x.com') || markDef.href?.includes('twitter.com')) &&
					markDef.href?.includes('/status/')
				);
			});
		});
	}

	/**
	 * Extracts the X (Twitter) URL from a block
	 * @param {Block} block - The block to extract the URL from
	 * @returns {string | null} The X URL or null if not found
	 */
	function getXUrl(block: Block): string | null {
		if (!block.children || !block.markDefs) return null;

		for (const child of block.children) {
			if (!child.marks) continue;
			for (const mark of child.marks) {
				const markDef = block.markDefs?.find((def: { _key: string }) => def._key === mark);
				if (
					markDef?._type === 'link' &&
					(markDef.href?.includes('x.com') || markDef.href?.includes('twitter.com')) &&
					markDef.href?.includes('/status/')
				) {
					// Extract username and status ID from the URL
					const url = new URL(markDef.href);
					const pathParts = url.pathname.split('/').filter(Boolean); // Remove empty strings
					const statusIndex = pathParts.indexOf('status');
					if (statusIndex !== -1 && statusIndex + 1 < pathParts.length) {
						const username = pathParts[statusIndex - 1];
						const statusId = pathParts[statusIndex + 1];
						return `${username}/status/${statusId}`;
					}
				}
			}
		}
		return null;
	}

	/**
	 * Checks if a block contains a YouTube link
	 * @param {Block} block - The block to check
	 * @returns {boolean} True if the block contains a YouTube link
	 */
	function isYouTubeLink(block: Block): boolean {
		if (!block.children || !block.markDefs) return false;

		return block.children.some((child: { text: string; marks?: string[] }) => {
			if (!child.marks) return false;
			return child.marks.some((mark: string) => {
				const markDef = block.markDefs?.find((def: { _key: string }) => def._key === mark);
				return (
					markDef?._type === 'link' &&
					(markDef.href?.includes('youtube.com') || markDef.href?.includes('youtu.be'))
				);
			});
		});
	}

	/**
	 * Extracts the YouTube video ID from a block
	 * @param {Block} block - The block to extract the video ID from
	 * @returns {string | null} The YouTube video ID or null if not found
	 */
	function getYouTubeId(block: Block): string | null {
		if (!block.children || !block.markDefs) return null;

		for (const child of block.children) {
			if (!child.marks) continue;
			for (const mark of child.marks) {
				const markDef = block.markDefs?.find((def: { _key: string }) => def._key === mark);
				if (
					markDef?._type === 'link' &&
					(markDef.href?.includes('youtube.com') || markDef.href?.includes('youtu.be'))
				) {
					// Handle youtu.be links
					if (markDef.href.includes('youtu.be')) {
						const url = new URL(markDef.href);
						return url.pathname.slice(1); // Remove leading slash
					}

					// Handle youtube.com links
					const url = new URL(markDef.href);
					return url.searchParams.get('v');
				}
			}
		}
		return null;
	}
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
		{:else if value.style === 'h3'}
			<div class="mx-auto max-w-5xl portable-override pt-20 pb-6">
				<PortableText value={value.blocks ? value.blocks : value} {components} />
			</div>
		{:else if value.style === 'h6'}
			<div class="mx-auto max-w-5xl portable-override pt-24">
				<PortableText value={value.blocks ? value.blocks : value} {components} />
			</div>
		{:else if value.listItem}
			<div class="mx-auto max-w-5xl portable-override mb-2">
				<PortableText value={value.blocks ? value.blocks : value} {components} />
			</div>
		{:else if isXLink(value)}
			<div class="mx-auto max-w-5xl my-24">
				<Tweet tweetLink={getXUrl(value) ?? ''} theme="dark" />
			</div>
		{:else if isYouTubeLink(value)}
			<div class="mx-auto max-w-[800px] my-24">
				<YouTube youTubeId={getYouTubeId(value) ?? ''} modestBranding={true} />
			</div>
		{:else}
			<div
				class="mx-auto max-w-5xl portable-override"
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
	:global(.portable-override h6) {
		@apply text-xs text-mid-grey font-light;
	}
	:global(.portable-override a) {
		@apply text-black hover:text-dark-red underline;
	}
	:global(.portable-override h6 a) {
		@apply text-mid-grey underline;
	}
	:global(.portable-override ol) {
		@apply list-decimal list-outside ml-8;
	}
	:global(.portable-override ol li) {
		@apply text-dark-grey;
	}
	:global(.portable-override ul) {
		@apply list-disc list-outside ml-8;
	}
	:global(.portable-override ul li) {
		@apply text-dark-grey;
	}
</style>
