<script>
	/**
	 * GlobalBanner — renders the first enabled, non-dismissed banner in `BANNERS`
	 * inside a fixed dark-pill shell. Each banner's content is a Svelte snippet,
	 * so authors can write whatever markup they like (own classes, multiple
	 * elements, links, emojis); the shell (background, layout, fly-in, ✕ button)
	 * stays consistent.
	 *
	 * To add a banner:
	 *   1. Author a `{#snippet}` in the markup section below with the content
	 *      you want.
	 *   2. Append an entry to `BANNERS` with a unique `key`, `enabled: true`,
	 *      and `content` pointing at the snippet. Optionally override
	 *      `expiryMs` (defaults to 30 days; use `Infinity` for permanent
	 *      dismissals).
	 *   3. Disable a banner by flipping `enabled: false` (its dismissal entry
	 *      is then cleaned out of users' localStorage on next mount) or just
	 *      delete its entry.
	 */

	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import IconXMark from '$lib/icons/XMark.svelte';
	import { cleanupObsoleteDismissals, dismissalKey, getActiveBanner } from './banners.js';

	/**
	 * @typedef {import('./banners.js').BannerMeta & { content: import('svelte').Snippet }} Banner
	 */

	/** @type {Banner[]} */
	const BANNERS = [{ key: 'feedback-2026', enabled: false, content: feedbackContent }];

	/** @type {Banner | null} */
	let active = $state(null);

	onMount(() => {
		cleanupObsoleteDismissals(BANNERS, window.localStorage);
		// Wait one frame so the fly-in transition has a "before" state to animate from.
		const frame = requestAnimationFrame(() => {
			active = /** @type {Banner | null} */ (
				getActiveBanner(BANNERS, window.localStorage, Date.now())
			);
		});
		return () => cancelAnimationFrame(frame);
	});

	function dismiss() {
		if (!active) return;
		window.localStorage.setItem(dismissalKey(active.key), String(Date.now()));
		active = null;
	}
</script>

<!--
	Banner content snippets. Author whatever markup you want — own classes,
	multiple elements, links, emojis. The shell below stays fixed.
-->
{#snippet feedbackContent()}
	🔮 <a href="https://forms.gle/oHzViVX2ePhHtaFX6" target="_blank" class="underline text-white">
		Have your say on the future of Open Electricity
	</a>
{/snippet}

{#if active}
	<div
		transition:fly={{ y: -40, duration: 300 }}
		class="relative w-full bg-black text-white text-sm leading-sm px-10 md:px-8 py-6 font-light md:flex gap-3 justify-center"
	>
		{@render active.content()}

		<button class="absolute cursor right-5 top-7" onclick={dismiss} aria-label="Dismiss banner">
			<IconXMark classes="w-8 h-8" />
		</button>
	</div>
{/if}
