<script>
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { dataTrackerLink } from '$lib/stores/app';
	import { getNavItems } from '$lib/components/nav/nav-items.js';

	let navItems = getNavItems($dataTrackerLink);
	let isOpen = $state(false);

	function handleClickOutside() {
		isOpen = false;
	}
</script>

<div class="relative shrink-0" use:clickoutside onclickoutside={handleClickOutside}>
	<button
		onclick={() => (isOpen = !isOpen)}
		class="flex items-center px-2 py-1 rounded-lg hover:bg-warm-grey transition-colors cursor-pointer"
		title="Open navigation menu"
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
			{#each navItems as item (item.name)}
				{@const isActive = item.href !== '/' && page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					onclick={() => (isOpen = false)}
					class="block px-4 py-2 text-sm hover:bg-light-warm-grey transition-colors"
					class:font-semibold={isActive}
					class:text-black={isActive}
					class:text-mid-grey={!isActive}
					role="menuitem"
				>
					{item.name}
				</a>
			{/each}
		</div>
	{/if}
</div>
