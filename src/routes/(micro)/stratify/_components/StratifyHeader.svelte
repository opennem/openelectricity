<script>
	import { page } from '$app/state';
	import { getClerkState } from '$lib/auth/clerk.svelte.js';
	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';
	import { FullscreenFilterBar, FullscreenNavDropdown } from '$lib/components/fullscreen';
	import UserIcon from '@lucide/svelte/icons/user';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	/** @type {{ right?: import('svelte').Snippet, sticky?: boolean }} */
	let { right, sticky = false } = $props();

	const clerkState = getClerkState();
	let showUserMenu = $state(false);
	let pathname = $derived(page.url.pathname);
	/** @type {HTMLElement | undefined} */
	let userTriggerRef = $state();
	/** @type {HTMLElement | undefined} */
	let userMenuRef = $state();

	const navigation = [
		{
			href: '/stratify',
			label: 'My charts',
			match: (/** @type {string} */ path) => path === '/stratify'
		},
		{
			href: '/stratify/new',
			label: 'Create',
			match: (/** @type {string} */ path) => path.startsWith('/stratify/new')
		},
		{
			href: '/strata-community',
			label: 'Community',
			match: (/** @type {string} */ path) => path.startsWith('/strata-community')
		}
	];

	/** @param {MouseEvent} event */
	function handleDocumentClick(event) {
		const target = /** @type {Node} */ (event.target);
		if (userTriggerRef?.contains(target) || userMenuRef?.contains(target)) return;
		showUserMenu = false;
	}
</script>

<svelte:document onclick={handleDocumentClick} />

<header
	class="{sticky
		? 'sticky top-0'
		: ''} relative z-[70] shrink-0 border-b border-warm-grey bg-light-warm-grey/75 backdrop-blur-sm"
>
	<FullscreenFilterBar
		isFullscreen={true}
		routeKey="stratify"
		stableName="filter-bar-stable-stratify"
		paddingX="px-4 md:px-6"
		bgClass="bg-light-warm-grey/75"
	>
		{#snippet stable()}
			<FullscreenNavDropdown />
			<a
				href="/stratify"
				class="rounded-lg px-2 py-1 text-sm font-semibold text-dark-grey no-underline hover:bg-warm-grey hover:no-underline lg:text-base"
			>
				Stratify
			</a>
		{/snippet}

		{#snippet rest()}
			<div class="h-8 shrink-0 border-l border-warm-grey"></div>
			<nav class="hidden items-center gap-7 pl-3 md:flex" aria-label="Stratify">
				{#each navigation as item (item.href)}
					<a
						href={item.href}
						class="text-sm font-medium hover:text-black hover:no-underline {item.match(pathname)
							? 'font-semibold text-black'
							: 'text-mid-grey'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		{/snippet}

		{#snippet options()}
			<div class="flex items-center gap-2 px-2">
				{#if right}
					{@render right()}
				{/if}

				{#if clerkState.user}
					<button
						bind:this={userTriggerRef}
						type="button"
						onclick={() => (showUserMenu = !showUserMenu)}
						class="flex size-9 items-center justify-center rounded-full border border-warm-grey text-mid-grey transition-colors hover:border-dark-grey hover:text-dark-grey"
						title={clerkState.user.primaryEmailAddress?.emailAddress ?? ''}
						aria-haspopup="menu"
						aria-expanded={showUserMenu}
					>
						<UserIcon size={14} />
					</button>

					{#if showUserMenu}
						<div
							bind:this={userMenuRef}
							use:portal
							use:dropdownPosition={{ trigger: userTriggerRef, align: 'right', position: 'bottom' }}
							class="fixed z-[80] min-w-[220px] rounded-lg border border-warm-grey bg-white py-1 shadow-lg"
							role="menu"
						>
							<span
								class="block truncate border-b border-warm-grey px-4 py-3 text-sm text-mid-grey"
							>
								{clerkState.user.primaryEmailAddress?.emailAddress ?? ''}
							</span>
							<button
								type="button"
								onclick={() => {
									showUserMenu = false;
									clerkState.instance?.signOut({ redirectUrl: '/stratify' });
								}}
								class="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-mid-grey transition-colors hover:bg-light-warm-grey/50 hover:text-dark-grey"
								role="menuitem"
							>
								<LogOutIcon size={12} />
								Sign out
							</button>
						</div>
					{/if}
				{/if}
			</div>
		{/snippet}
	</FullscreenFilterBar>
</header>
