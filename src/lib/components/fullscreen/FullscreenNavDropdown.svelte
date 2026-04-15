<script>
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { ChevronDown } from '@lucide/svelte';
	import { dataTrackerLink } from '$lib/stores/app';
	import { getNavItems } from '$lib/components/nav/nav-items.js';

	let navItems = getNavItems($dataTrackerLink);
	let isOpen = $state(false);

	let currentLabel = $derived.by(() => {
		const pathname = page.url.pathname;
		const match = navItems.find((item) => item.href !== '/' && pathname.startsWith(item.href));
		return match?.name ?? 'Menu';
	});

	function handleClickOutside() {
		isOpen = false;
	}
</script>

<div class="relative" use:clickoutside onclickoutside={handleClickOutside}>
	<button
		onclick={() => (isOpen = !isOpen)}
		class="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-warm-grey transition-colors cursor-pointer text-sm font-semibold whitespace-nowrap"
		title="Navigate"
	>
		<span>{currentLabel}</span>
		<ChevronDown
			class="size-4 transition-transform duration-200"
			style="transform: rotate({isOpen ? '180deg' : '0deg'})"
		/>
	</button>

	{#if isOpen}
		<div
			class="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-[180px] py-1"
			in:fly={{ y: -5, duration: 150 }}
		>
			{#each navItems as item (item.name)}
				{@const isActive =
					item.href !== '/' && page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					onclick={() => (isOpen = false)}
					class="block px-4 py-2 text-sm hover:bg-light-warm-grey transition-colors"
					class:font-semibold={isActive}
					class:text-black={isActive}
					class:text-mid-grey={!isActive}
				>
					{item.name}
				</a>
			{/each}
		</div>
	{/if}
</div>
