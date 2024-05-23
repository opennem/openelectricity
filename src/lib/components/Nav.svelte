<script>
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { dataTrackerLink } from '$lib/stores/app';

	const navItems = [
		{ name: 'Data Tracker', href: $dataTrackerLink },
		{ name: 'Map', href: `${$dataTrackerLink}/facilities` },
		{ name: 'Scenarios', href: '/scenarios' },
		// { name: 'Latest Records', href: '/records' },
		{ name: 'Analysis', href: '/analysis' },
		{ name: 'About', href: '/about' }
	];

	let mobileNavActive = false;

	afterNavigate(() => {
		mobileNavActive = false;
	});
</script>

<header class="h-28 border-mid-warm-grey border-b-[0.05rem] border-solid">
	<div class="container max-w-none lg:container flex items-center justify-between h-full">
		<a href="/" class="absolute md:relative z-40" class:top-12={mobileNavActive}>
			<h1 class="m-0 w-[200px]">
				<img class="block" src="/img/logo.svg" alt="Open Electricity" />
			</h1>
		</a>
		<nav
			class="block fixed top-0 left-0 h-full w-full z-30 bg-white pt-36 px-10 md:w-auto md:static md:px-4 md:py-2 md:flex md:justify-between md:gap-12 lg:gap-16"
			class:hidden={!mobileNavActive}
		>
			{#each navItems as { name, href }}
				<a
					class="text-lg font-medium flex items-center mb-8 md:text-sm md:mb-0 hover:no-underline text-dark-grey"
					class:active={$page.url.pathname === href}
					{href}
				>
					{name}
				</a>
			{/each}
		</nav>

		<button
			class="md:hidden absolute right-10 z-40"
			class:top-12={mobileNavActive}
			on:click={() => {
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
	/* nav active markers */
	nav a:after {
		content: '';
		display: block;
		width: 0.8rem;
		height: 0.8rem;
		border: 0.1rem solid theme(colors.black);
		margin-left: 1rem;
		opacity: 0;
	}
	nav a:hover:after {
		opacity: 1;
	}
	nav a.active {
		font-weight: theme(fontWeight.bold);
	}
	nav a.active:after {
		border-color: theme(colors.red);
		background-color: theme(colors.red);
		opacity: 1;
	}
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
