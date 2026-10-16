<script>
	import { version } from '$app/environment';
	import { Maximize2 } from '@lucide/svelte';
	import ApiStatus from '$lib/components/ApiStatus.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { DATA_SOURCES, RESOURCE_LINKS } from './site-links.js';

	/**
	 * FullscreenFooter — the small chrome strip pinned to the bottom of a
	 * fullscreen card. In fullscreen mode (where the site Footer is hidden) it
	 * stands in for it: build version, API status and data sources on the left;
	 * Platform / Docs / Licence icon links and a link back to the home page on
	 * the right.
	 * Otherwise it shows an "Enter full screen" button that calls
	 * `onenterfullscreen` (kbd hint: F).
	 *
	 * @type {{
	 *   isFullscreen: boolean,
	 *   onenterfullscreen?: () => void
	 * }}
	 */
	let { isFullscreen, onenterfullscreen } = $props();
</script>

<footer
	class="relative z-10 shrink-0 border-t border-warm-grey bg-light-warm-grey/40 shadow-[0_-10px_15px_-3px_rgb(0_0_0/0.05)] px-4 py-2 flex items-center justify-between gap-3 text-xs"
>
	{#if isFullscreen}
		<div class="flex items-center gap-4 min-w-0">
			<span class="text-mid-grey font-mono">v{version}</span>
			<ApiStatus variant="compact" />
			<!-- Phones keep the version, API status and links; the data sources
			     and the home link (the logo menu covers it) need the room. -->
			<div class="flex items-center gap-1 max-tablet:hidden">
				{#each DATA_SOURCES as { href, label } (href)}
					<a
						{href}
						title="Source: {label}"
						target="_blank"
						rel="noopener noreferrer"
						class="text-dark-grey no-underline bg-white border border-warm-grey rounded px-1.5 py-0.5 leading-none hover:text-red hover:border-red hover:no-underline"
						>{label}</a
					>
				{/each}
			</div>
		</div>
		<div class="flex items-center gap-4 shrink-0">
			<div class="flex items-center gap-2">
				{#each RESOURCE_LINKS as { href, label, icon: Icon } (href)}
					<Tooltip text={label}>
						{#snippet trigger({ props })}
							<a
								{...props}
								{href}
								aria-label={label}
								target="_blank"
								rel="noopener noreferrer"
								class="text-mid-grey hover:text-red"
							>
								<Icon size={14} />
							</a>
						{/snippet}
					</Tooltip>
				{/each}
			</div>
			<a href="/" class="text-dark-grey no-underline hover:text-red max-tablet:hidden"
				>Open Electricity</a
			>
		</div>
	{:else}
		<span></span>
		<button
			onclick={() => onenterfullscreen?.()}
			class="text-mid-grey hover:text-dark-grey flex items-center gap-1.5 cursor-pointer transition-colors"
			title="Enter full screen"
		>
			<Maximize2 size={14} />
			<span>Enter full screen</span>
			<kbd
				class="text-[10px] text-dark-grey bg-white border border-warm-grey rounded px-1.5 py-0.5 leading-none"
				>F</kbd
			>
		</button>
	{/if}
</footer>
