<script>
	// import { shortcut } from '@svelte-put/shortcut';
	import { fly } from 'svelte/transition';
	import { onNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import { building } from '$app/environment';
	import { setContext, onMount } from 'svelte';
	// import '../../app.css';

	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import IconXMark from '$lib/icons/XMark.svelte';
	// import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';

	import { bannerOpen } from '$lib/stores/app';
	import { showThemeSwitcher } from '$lib/stores/theme';
	import { toastMessage } from '$lib/stores/toast';
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { children } = $props();

	// Fullscreen mode — derived from the `?fullscreen=true` URL param (available at
	// SSR / first paint, so Nav/Footer never flash in before the page mounts) and
	// OR'd with an override set by child pages that force fullscreen imperatively.
	let contextFullscreen = $state(false);
	let urlFullscreen = $derived(
		!building && page.url.searchParams.get('fullscreen') === 'true'
	);
	let isFullscreen = $derived(contextFullscreen || urlFullscreen);

	setContext('layout-fullscreen', {
		/** @param {boolean} value */
		setFullscreen: (value) => {
			contextFullscreen = value;
		}
	});

	/** Set to a snippet/string to enable the global banner, or null to disable */
	const bannerMessage = 'Have your say on the future of Open Electricity';
	const bannerLink = 'https://forms.gle/oHzViVX2ePhHtaFX6';
	let bannerReady = $state(false);
	let showBanner = $derived(!!bannerMessage && bannerReady && $bannerOpen);

	onMount(() => {
		setTimeout(() => {
			bannerReady = true;
		}, 10);
	});

	let currentRoute = $derived(page.url.pathname);
	// let isRecordsRoute = $derived(currentRoute.includes('/records'));
	// let feedbackButtonRef = $state();
	// let feedbackButtonPosition = $derived(feedbackButtonRef?.getBoundingClientRect());

	onNavigate((navigation) => {
		// If the browser doesn't support view transitions, return early
		// @ts-ignore
		if (!document.startViewTransition) return;

		// Skip view transitions for in-section navigations:
		//   - /facilities filter changes / map clicks (same pathname)
		//   - /facility/[code] → /facility/[code'] when stepping through the
		//     sidebar facility list (different code, same /facility/ section)
		// We only want to animate the cross-route hop between /facilities and
		// /facility/[code].
		const fromPath = navigation.from?.url.pathname ?? '';
		const toPath = navigation.to?.url.pathname ?? '';
		if (fromPath === toPath) return;
		if (fromPath.startsWith('/facility/') && toPath.startsWith('/facility/')) return;

		return new Promise((resolve) => {
			// @ts-ignore
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// function handleCmdK() {
	// 	$showThemeSwitcher = !$showThemeSwitcher;
	// }
</script>

<!-- <svelte:window
	use:shortcut={{
		trigger: [
			{
				key: 'k',
				modifier: ['ctrl', 'meta'],
				callback: handleCmdK
			},
			{
				key: 'Escape',
				callback: () => ($showThemeSwitcher = false)
			}
		]
	}}
/> -->

<!-- {#if $showThemeSwitcher}
	<ThemeSwitcher on:selected={() => ($showThemeSwitcher = false)} />
{/if} -->

<!-- <div
	class="relative w-full bg-black text-white text-sm leading-sm px-10 md:px-8 py-6 font-light md:flex gap-3 justify-center"
>
	<div>abc</div>

	<button
		class="absolute right-10 md:right-16 top-10 md:top-6"
		onclick={() => ($bannerOpen = false)}
	>
		<IconXMark classes="w-8 h-8" />
	</button>
</div> -->

<!-- <div
	class="relative w-full bg-black text-white text-sm leading-sm px-10 md:px-8 py-6 font-light md:flex gap-3 justify-center"
>
	<div>
		We're updating our Facilities page and your feedback helps! Take our
		<a
			href="https://docs.google.com/forms/d/e/1FAIpQLSfhGRg43hUUV4d229e44GfLFtEmS_vsJ8FaBOoS5MdHk-VNFw/viewform?usp=sharing&ouid=105526448285097294979"
			target="_blank"
			class="underline text-white"
		>
			survey
		</a>.
	</div>
</div> -->

<!-- <div
	class="relative w-full bg-black text-white text-sm leading-sm px-10 md:px-8 py-6 font-light md:flex gap-3 justify-center"
>
	<div>
		⚡️ Sign up for Open Electricity updates - direct to your inbox 📬.
		<a href="https://openelectricity.org.au/newsletter" class="underline text-white"
			>Subscribe now</a
		>.
	</div>
</div> -->

<!-- {#if feedbackButtonPosition}
		<div
			class="absolute z-50 bg-white border border-warm-grey rounded-lg px-8 py-6 shadow-lg"
			style="transform: translate({feedbackButtonPosition?.x}px, {feedbackButtonPosition?.y}px)"
		>
			<form action="" class="flex flex-col gap-2">
				<label for="email" class="text-xs font-space">Email</label>
				<input type="email" id="email" />
				<label for="message" class="text-xs font-space">Message</label>
				<textarea name="message" id="message" cols="30" rows="10"></textarea>
				<button type="submit" class="bg-black text-white px-4 py-2 rounded-lg mt-2">Send</button>
				<button
					type="button"
					class="bg-white text-black px-4 py-2 rounded-lg mt-2 border border-mid-warm-grey"
					>Cancel</button
				>
			</form>
		</div>
	{/if} -->

{#if !isFullscreen}
	{#if showBanner}
		<div
			transition:fly={{ y: -40, duration: 300 }}
			class="relative w-full bg-black text-white text-sm leading-sm px-10 md:px-8 py-6 font-light md:flex gap-3 justify-center"
		>
			<div>
				🔮 <a href={bannerLink} target="_blank" class="underline text-white"
					>{bannerMessage}</a
				>
			</div>

			<button
				class="absolute cursor right-5 top-7"
				onclick={() => ($bannerOpen = false)}
			>
				<IconXMark classes="w-8 h-8" />
			</button>
		</div>
	{/if}
	<Nav />
{/if}

<main class="grow">
	{@render children?.()}
</main>

{#if !isFullscreen}
	<Footer />
{/if}

{#if updated.current}
	<div
		transition:fly={{ y: 20, duration: 300 }}
		class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] rounded-lg bg-dark-grey text-white px-6 py-3 text-sm shadow-lg flex items-center gap-4"
	>
		<span>A new version of Open Electricity is available</span>
		<button
			class="underline font-medium whitespace-nowrap"
			onclick={() => location.reload()}
		>
			Refresh
		</button>
	</div>
{/if}

{#if $toastMessage}
	<div
		transition:fly={{ y: -20, duration: 300 }}
		class="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] rounded-lg bg-dark-grey text-white px-6 py-3 text-sm shadow-lg"
	>
		{$toastMessage}
	</div>
{/if}

<style>
	/* Experimental: paired view-transition for /facilities ↔ /facility/[code].
	   The logomark + first breadcrumb (filter-bar-stable) and the options
	   dropdown (filter-bar-options) stay put across the route swap; only the
	   page-specific middle region (filter-bar-rest-{routeKey}) slides in
	   from the left. Body card (page-body) uses the browser default
	   cross-fade. Remove this block plus the matching `view-transition-name`
	   hooks in the two routes to revert. */
	:global {
		/* Logo + first breadcrumb on the left, options dropdown on the right —
		   both stay visually fixed across the route swap. */
		::view-transition-group(filter-bar-stable),
		::view-transition-old(filter-bar-stable),
		::view-transition-new(filter-bar-stable),
		::view-transition-group(filter-bar-options),
		::view-transition-old(filter-bar-options),
		::view-transition-new(filter-bar-options) {
			animation: none;
		}
		/* The middle (page-specific) region uses its OWN view-transition-name
		   per route (-list on /facilities, -detail on /facility/[code]). The
		   names don't pair, so each side keeps its natural width and
		   slides/fades without the default group-size morph (the "zoom"). */
		::view-transition-old(filter-bar-rest-list),
		::view-transition-old(filter-bar-rest-detail) {
			animation: facilities-filter-bar-slide-out 240ms ease both;
		}
		::view-transition-new(filter-bar-rest-list),
		::view-transition-new(filter-bar-rest-detail) {
			animation: facilities-filter-bar-slide-in 240ms ease both;
		}
		@keyframes facilities-filter-bar-slide-out {
			to {
				transform: translateX(24px);
				opacity: 0;
			}
		}
		@keyframes facilities-filter-bar-slide-in {
			from {
				transform: translateX(-24px);
				opacity: 0;
			}
		}
	}
</style>
