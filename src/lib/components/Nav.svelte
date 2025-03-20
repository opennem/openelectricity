<script>
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { dataTrackerLink, parsedFeatureFlags } from '$lib/stores/app';
	const navItems = [
		{ name: 'Tracker', href: $dataTrackerLink },
		{ name: 'Facilities', href: `${$dataTrackerLink}/facilities` },
		{ name: 'Scenarios', href: '/scenarios' },
		{ name: 'Records', href: '/records', show: parsedFeatureFlags['show_records'] },
		{ name: 'Analysis', href: '/analysis' },
		{ name: 'About', href: '/about' }
	];

	let mobileNavActive = $state(false);

	afterNavigate(() => {
		mobileNavActive = false;
	});
</script>

<header class="h-28 border-mid-warm-grey border-b-[0.05rem] border-solid">
	<div class="max-w-none px-10 md:px-16 flex items-center justify-between h-full">
		<div
			class="absolute md:relative z-[45] flex items-center gap-6"
			class:top-[18.5px]={mobileNavActive}
		>
			<a href="/" class="">
				<h1 class="m-0 w-[200px]">
					<img class="block" src="/img/logo.svg" alt="Open Electricity" />
				</h1>
			</a>
		</div>

		<nav
			class="block fixed top-0 left-0 h-full w-full z-40 bg-white pt-36 px-10 md:w-auto md:static md:px-0 md:py-2 md:flex md:justify-between md:gap-16 lg:gap-20"
			class:hidden={!mobileNavActive}
		>
			{#each navItems as { name, href, show }}
				{#if show !== false}
					<a
						class="text-lg font-medium flex items-center mb-8 md:text-sm md:mb-0"
						class:text-mid-grey={!page.url.pathname.includes(href)}
						class:text-black={page.url.pathname.includes(href)}
						class:font-semibold={page.url.pathname.includes(href)}
						{href}
					>
						{name}
					</a>
				{/if}
			{/each}
		</nav>

		<button
			aria-label="Toggle mobile navigation"
			class="md:hidden absolute right-10 z-40"
			class:top-[24.5px]={mobileNavActive}
			onclick={() => {
				mobileNavActive = !mobileNavActive;
			}}
		>
			<svg
				width="21"
				height="21"
				viewBox="0 0 21 21"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				class="burger md:hidden"
				class:burgerActive={mobileNavActive}
			>
				<g>
					<circle cx="1.5" cy="1.5" r="1.5" fill="black" />
					<circle cx="10.5" cy="1.5" r="1.5" fill="black" class="hider" />
					<circle cx="19.5" cy="1.5" r="1.5" fill="black" />

					<circle cx="1.5" cy="10.5" r="1.5" fill="black" class="hider" />
					<circle cx="10.5" cy="10.5" r="1.5" fill="black" />
					<circle cx="19.5" cy="10.5" r="1.5" fill="black" class="hider" />

					<circle cx="1.5" cy="19.5" r="1.5" fill="black" />
					<circle cx="10.5" cy="19.5" r="1.5" fill="black" class="hider" />
					<circle cx="19.5" cy="19.5" r="1.5" fill="black" />

					<line x1="1.5" y1="1.5" x2="19.5" y2="19.5" stroke="black" />
					<line x1="19.5" y1="1.5" x2="1.5" y2="19.5" stroke="black" />
				</g>
			</svg>
		</button>
	</div>
</header>

<style lang="postcss">
	/* burger menu states */
	.burger circle {
		opacity: 1;
		transition: opacity 0.5s ease;
	}
	.burger line {
		transition: all 0.5s ease;
		transform-origin: center;
		transform: scale(0);
	}
	.burgerActive circle.hider {
		opacity: 0;
	}
	.burgerActive line {
		transform: scale(1);
	}
</style>
