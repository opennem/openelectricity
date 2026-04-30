<script>
	import { version } from '$app/environment';
	import { Maximize2 } from '@lucide/svelte';

	/**
	 * FullscreenFooter — the small chrome strip pinned to the bottom of a
	 * fullscreen card. In fullscreen mode it shows the build version and a link
	 * back to the home page; otherwise it shows an "Enter full screen" button
	 * that calls `onenterfullscreen` (kbd hint: F).
	 *
	 * @type {{
	 *   isFullscreen: boolean,
	 *   onenterfullscreen?: () => void
	 * }}
	 */
	let { isFullscreen, onenterfullscreen } = $props();
</script>

<footer
	class="shrink-0 border-t border-warm-grey bg-light-warm-grey/40 px-4 py-2 flex items-center justify-between gap-3"
>
	{#if isFullscreen}
		<span class="text-[10px] text-mid-grey font-mono">v{version}</span>
		<a href="/" class="text-[10px] text-dark-grey no-underline hover:text-red">
			Open Electricity
		</a>
	{:else}
		<span></span>
		<button
			onclick={() => onenterfullscreen?.()}
			class="text-[10px] text-mid-grey hover:text-dark-grey flex items-center gap-1.5 cursor-pointer transition-colors"
			title="Enter full screen"
		>
			<Maximize2 size={12} />
			<span>Enter full screen</span>
			<kbd
				class="text-[10px] font-sans text-dark-grey bg-white border border-warm-grey rounded px-1.5 py-0.5 leading-none"
				>F</kbd
			>
		</button>
	{/if}
</footer>
