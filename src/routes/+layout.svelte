<script>
	import { shortcut } from '@svelte-put/shortcut';
	import { onNavigate } from '$app/navigation';
	import '../app.css';

	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import IconXMark from '$lib/icons/XMark.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';

	import { bannerOpen } from '$lib/stores/app';
	import { showThemeSwitcher } from '$lib/stores/theme';
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { children } = $props();

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

	function handleCmdK() {
		$showThemeSwitcher = !$showThemeSwitcher;
	}
</script>

<svelte:window
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
/>

{#if $showThemeSwitcher}
	<ThemeSwitcher on:selected={() => ($showThemeSwitcher = false)} />
{/if}

{#if $bannerOpen}
	<div
		class="relative w-full bg-black text-white text-sm leading-sm px-10 md:px-8 py-6 font-light md:flex gap-3 justify-center"
	>
		<div>
			<strong class="font-semibold">OpenNEM</strong> is now
			<strong class="font-semibold">Open Electricity</strong>.
		</div>
		<div>
			<a
				href="https://openelectricity.org.au/analysis/welcome-open-electricity"
				class="underline text-white"
			>
				Read
			</a> about the update.
		</div>
		<button
			class="absolute right-10 md:right-16 top-10 md:top-6"
			onclick={() => ($bannerOpen = false)}
		>
			<IconXMark classes="w-8 h-8" />
		</button>
	</div>
{/if}

<Nav />

<main class="flex-grow">
	{@render children?.()}
</main>

<Footer />
