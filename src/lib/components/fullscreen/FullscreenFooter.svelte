<script>
	import { version } from '$app/environment';

	/**
	 * FullscreenFooter — the small chrome strip pinned to the bottom of a
	 * fullscreen card: build version on the left, a link home on the right.
	 */
</script>

<footer
	class="shrink-0 border-t border-warm-grey bg-light-warm-grey/40 px-4 py-2 flex items-center justify-between gap-3"
>
	<span class="text-[10px] text-mid-grey font-mono">v{version}</span>
	<a href="/" class="text-[10px] text-dark-grey no-underline hover:text-red"> Open Electricity </a>
</footer>
