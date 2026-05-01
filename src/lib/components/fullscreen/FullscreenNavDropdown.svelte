<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { dataTrackerLink } from '$lib/stores/app';
	import { getNavItems } from '$lib/components/nav/nav-items.js';

	const TOGGLE_KEY = 'g';

	/** @type {{ name: string, href: string }[]} */
	let navItems = $derived([{ name: 'Home', href: '/' }, ...getNavItems($dataTrackerLink)]);

	let isOpen = $state(false);
	let activeIndex = $state(0);

	function openMenu() {
		activeIndex = 0;
		isOpen = true;
	}

	function closeMenu() {
		isOpen = false;
	}

	function toggleMenu() {
		if (isOpen) closeMenu();
		else openMenu();
	}

	function handleClickOutside() {
		closeMenu();
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		if (!isOpen) {
			if (e.key.toLowerCase() === TOGGLE_KEY) {
				e.preventDefault();
				openMenu();
			}
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			closeMenu();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = (activeIndex + 1) % navItems.length;
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = (activeIndex - 1 + navItems.length) % navItems.length;
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const item = navItems[activeIndex];
			if (item) {
				closeMenu();
				goto(item.href);
			}
			return;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative shrink-0" use:clickoutside onclickoutside={handleClickOutside}>
	<button
		onclick={toggleMenu}
		class="flex items-center px-2 py-1 rounded-lg hover:bg-warm-grey transition-colors cursor-pointer"
		title="Open navigation menu (g)"
		aria-haspopup="menu"
		aria-expanded={isOpen}
	>
		<img src="/logo-mark.png" alt="Open Electricity" class="h-8 w-auto" />
	</button>

	{#if isOpen}
		<div
			class="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-[180px] py-1"
			in:fly={{ y: -5, duration: 150 }}
			role="menu"
		>
			{#each navItems as item, i (item.name)}
				{@const isCurrentRoute =
					item.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(item.href)}
				{@const isHighlighted = activeIndex === i}
				<a
					href={item.href}
					onclick={closeMenu}
					onmouseenter={() => (activeIndex = i)}
					class="block px-4 py-2 text-sm no-underline hover:no-underline transition-colors {isHighlighted
						? 'bg-light-warm-grey'
						: ''}"
					class:font-semibold={isCurrentRoute}
					class:text-black={isCurrentRoute}
					class:text-mid-grey={!isCurrentRoute}
					role="menuitem"
				>
					{item.name}
				</a>
			{/each}
		</div>
	{/if}
</div>
