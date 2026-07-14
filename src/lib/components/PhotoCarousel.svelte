<script>
	import { urlFor } from '$lib/sanity';
	import { fly } from 'svelte/transition';
	import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';
	import { portal } from '$lib/actions/portal.js';
	import { Backdrop } from '$lib/components/ui/backdrop';

	/**
	 * @type {{
	 *   photos: any[],
	 *   fill?: boolean,
	 *   class?: string
	 * }}
	 */
	let { photos = [], fill = false, class: className = '' } = $props();

	let photoIndex = $state(0);
	let currentPhoto = $derived(photos[photoIndex]);
	let slideDirection = $state(1);
	let lightboxIndex = $state(-1);
	let lightboxPhoto = $derived(lightboxIndex >= 0 ? photos[lightboxIndex] : null);
</script>

<svelte:window
	onkeydown={(e) => {
		if (lightboxIndex >= 0) {
			if (e.key === 'Escape') lightboxIndex = -1;
			if (e.key === 'ArrowLeft' && lightboxIndex > 0) lightboxIndex--;
			if (e.key === 'ArrowRight' && lightboxIndex < photos.length - 1) lightboxIndex++;
		} else {
			if (e.key === 'ArrowLeft' && photoIndex > 0) {
				slideDirection = -1;
				photoIndex--;
			}
			if (e.key === 'ArrowRight' && photoIndex < photos.length - 1) {
				slideDirection = 1;
				photoIndex++;
			}
		}
	}}
/>

{#if photos.length > 0}
	<div class="overflow-hidden rounded-lg border border-warm-grey {className}">
		<div class="relative bg-light-warm-grey overflow-hidden {fill ? 'h-full' : 'aspect-[4/3]'}">
			{#key photoIndex}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<img
					src={currentPhoto?.asset ? urlFor(currentPhoto).width(800).url() : ''}
					alt={currentPhoto?.alt || currentPhoto?.caption || 'Facility photo'}
					class="absolute inset-0 h-full w-full cursor-zoom-in object-cover"
					in:fly={{ x: slideDirection * 300, duration: 250 }}
					out:fly={{ x: slideDirection * -300, duration: 250 }}
					onclick={() => (lightboxIndex = photoIndex)}
				/>

				{#if currentPhoto?.caption}
					<div
						class="absolute left-0 right-0 bg-black/10 px-2 py-1.5 backdrop-blur-xs flex items-center justify-center {photos.length >
						1
							? 'bottom-6'
							: 'bottom-0 rounded-b-lg'}"
						in:fly={{ x: slideDirection * 300, duration: 250 }}
						out:fly={{ x: slideDirection * -300, duration: 250 }}
					>
						<p class="text-xs text-white truncate m-0">{currentPhoto.caption}</p>
					</div>
				{/if}
			{/key}

			{#if photos.length > 1}
				{#if photoIndex > 0}
					<button
						class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-transparent p-1.5 text-white/80 transition-colors hover:bg-black/40 hover:text-white"
						onclick={() => {
							slideDirection = -1;
							photoIndex--;
						}}
					>
						<ChevronLeft size={20} />
					</button>
				{/if}
				{#if photoIndex < photos.length - 1}
					<button
						class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-transparent p-1.5 text-white/80 transition-colors hover:bg-black/40 hover:text-white"
						onclick={() => {
							slideDirection = 1;
							photoIndex++;
						}}
					>
						<ChevronRight size={20} />
					</button>
				{/if}

				<!-- Dot indicators -->
				<div class="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
					{#each photos as photo, i (photo.asset?._ref ?? i)}
						<button
							class="size-2 rounded-full transition-colors {i === photoIndex
								? 'bg-white'
								: 'bg-white/40 hover:bg-white/70'}"
							aria-label="Go to photo {i + 1}"
							onclick={() => {
								slideDirection = i > photoIndex ? 1 : -1;
								photoIndex = i;
							}}
						></button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<Backdrop
	open={!!lightboxPhoto}
	variant="lightbox"
	onclick={() => (lightboxIndex = -1)}
	duration={150}
/>

{#if lightboxPhoto}
	<div
		use:portal
		class="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
	>
		<button
			class="absolute right-4 top-4 text-white/70 hover:text-white pointer-events-auto"
			onclick={() => (lightboxIndex = -1)}
		>
			<X size={24} />
		</button>

		{#if photos.length > 1}
			{#if lightboxIndex > 0}
				<button
					class="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white pointer-events-auto"
					onclick={() => lightboxIndex--}
				>
					<ChevronLeft size={32} />
				</button>
			{/if}
			{#if lightboxIndex < photos.length - 1}
				<button
					class="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white pointer-events-auto"
					onclick={() => lightboxIndex++}
				>
					<ChevronRight size={32} />
				</button>
			{/if}
		{/if}

		<div class="flex flex-col items-center gap-2 pointer-events-auto">
			<img
				src={lightboxPhoto.asset ? urlFor(lightboxPhoto).url() : ''}
				alt={lightboxPhoto.alt || lightboxPhoto.caption || 'Facility photo'}
				class="max-h-[85vh] max-w-[90vw] rounded object-contain"
			/>
			{#if lightboxPhoto.caption}
				<p class="max-w-[60vw] text-center text-xs text-white/70">
					{lightboxPhoto.caption}
				</p>
			{/if}
			{#if lightboxPhoto.attribution || lightboxPhoto.url}
				{@const sourceLabel = lightboxPhoto.attribution
					? `Source: ${lightboxPhoto.attribution}`
					: 'Source'}
				<p class="max-w-[60vw] text-center text-[11px] text-white/50">
					{#if lightboxPhoto.url}
						<a
							href={lightboxPhoto.url}
							target="_blank"
							rel="noopener noreferrer"
							class="underline hover:text-white"
						>
							{sourceLabel}
						</a>
					{:else}
						{sourceLabel}
					{/if}
				</p>
			{/if}
			{#if photos.length > 1}
				<p class="text-[10px] text-white/40">
					{lightboxIndex + 1} / {photos.length}
				</p>
			{/if}
		</div>
	</div>
{/if}
