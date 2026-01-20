<script>
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { dataTrackerLink } from '$lib/stores/app';
	import { fly } from 'svelte/transition';

	/**
	 * @typedef {Object} NavItem
	 * @property {string} name
	 * @property {string} href
	 * @property {NavItem[]} [children]
	 * @property {boolean} [show]
	 * @property {boolean} [beta]
	 */

	/** @type {NavItem[]} */
	let navItems = [
		{ name: 'Tracker', href: $dataTrackerLink },
		{ name: 'Facilities', href: `${$dataTrackerLink}/facilities` },
		{ name: 'Scenarios', href: '/scenarios' },
		{ name: 'Records', href: '/records' },
		{ name: 'Analysis', href: '/analysis' },
		{ name: 'About', href: '/about' }
	];

	let mobileNavActive = $state(false);
	/** @type {string | null} */
	let activeDropdown = $state(null);

	afterNavigate(() => {
		mobileNavActive = false;
		activeDropdown = null;
	});
</script>

<header class="h-28 border-mid-warm-grey border-b-[0.05rem] border-solid text-base">
	<div class="max-w-none px-10 md:px-16 flex items-center justify-between h-full">
		<div
			class="absolute md:relative flex items-center gap-6"
			class:top-[26px]={mobileNavActive}
			class:z-9999={mobileNavActive}
		>
			<a href="/" class="">
				<h1 class="m-0 w-[200px]">
					<img class="block" src="/img/logo.svg" alt="Open Electricity" />
				</h1>
			</a>
		</div>

		<nav
			class="block fixed top-0 left-0 h-full w-full z-999 bg-white pt-36 px-10 md:w-auto md:static md:px-0 md:py-2 md:flex md:justify-between md:gap-16 lg:gap-20"
			class:hidden={!mobileNavActive}
		>
			{#each navItems as { name, href, children, show } (name)}
				{#if show !== false}
					{#if children && children.length > 0}
						<div
							class="relative group mb-8 md:mb-0 md:flex items-center"
							onmouseenter={() => (activeDropdown = name)}
							onmouseleave={() => (activeDropdown = null)}
							role="group"
						>
							<a
								class="text-lg font-medium flex items-center md:text-sm cursor-pointer"
								class:text-mid-grey={!page.url.pathname.includes(href)}
								class:text-black={page.url.pathname.includes(href)}
								class:font-semibold={page.url.pathname.includes(href)}
								href={children ? '#' : href}
							>
								{name}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="ml-1 transition-transform duration-200"
									class:rotate-180={activeDropdown === name}
								>
									<path d="m6 9 6 6 6-6" />
								</svg>
							</a>

							{#if activeDropdown === name}
								<div
									class="md:absolute md:-left-2 md:top-18 w-full md:w-52 z-50"
									transition:fly={{ y: -10, duration: 200 }}
								>
									<div
										class="bg-white md:shadow-xs mt-3 md:mt-0 rounded-lg border border-warm-grey overflow-hidden flex flex-col divide-y divide-warm-grey"
									>
										{#each children as child (child.href)}
											<a
												href={child.href}
												class="group relative flex gap-4 items-center md:justify-between py-3 px-5 text-base md:text-sm hover:text-black hover:bg-mid-warm-grey/10 transition-colors"
												class:text-mid-grey={!page.url.pathname.includes(child.href)}
												class:text-black={page.url.pathname.includes(child.href)}
												class:font-semibold={page.url.pathname.includes(child.href)}
											>
												{child.name}

												{#if child.beta}
													<span
														class="md:absolute right-4 text-[8px] lowercase font-space font-medium text-light-warm-grey bg-gas rounded-full px-2 py-1"
													>
														Beta
													</span>
												{/if}
											</a>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{:else}
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
				{/if}
			{/each}
		</nav>

		<button
			aria-label="Toggle mobile navigation"
			class="md:hidden absolute right-10"
			class:top-[24.5px]={mobileNavActive}
			class:z-9999={mobileNavActive}
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
