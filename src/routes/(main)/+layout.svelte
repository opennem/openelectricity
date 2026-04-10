<script>
	// import { shortcut } from '@svelte-put/shortcut';
	import { fly } from 'svelte/transition';
	import { onNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
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

	// Fullscreen mode state - can be controlled by child pages via context
	let isFullscreen = $state(false);

	// Provide setter function to children via context
	setContext('layout-fullscreen', {
		/** @param {boolean} value */
		setFullscreen: (value) => {
			isFullscreen = value;
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
