<script>
	import { getClerkState } from '$lib/auth/clerk.svelte.js';

	const clerkState = getClerkState();
	let showUserMenu = $state(false);
</script>

<svelte:document onclick={(e) => {
	if (showUserMenu && !/** @type {HTMLElement} */ (e.target).closest('.user-menu-area')) {
		showUserMenu = false;
	}
}} />

<div class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
	<a href="/stratify" class="text-[11px] font-medium text-dark-grey tracking-wide uppercase hover:underline">
		Stratify
	</a>
	<span class="text-mid-warm-grey">|</span>
	<a
		href="/stratify"
		class="text-[11px] text-mid-grey hover:text-dark-grey"
	>
		Saved Charts
	</a>

	<div class="flex items-center gap-1 ml-auto">
		<a
			href="/stratify/new"
			class="rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey"
		>
			New Chart
		</a>

		{#if clerkState.user}
			<div class="relative ml-2 user-menu-area">
				<button
					type="button"
					onclick={() => (showUserMenu = !showUserMenu)}
					class="flex items-center justify-center w-7 h-7 rounded-full border border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey transition-colors"
					title={clerkState.user.primaryEmailAddress?.emailAddress ?? ''}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				</button>

				{#if showUserMenu}
					<div class="absolute right-0 top-9 z-50 bg-white border border-warm-grey rounded-lg shadow-md py-1 min-w-[180px]">
						<div class="px-3 py-2 border-b border-warm-grey">
							<p class="text-[10px] text-mid-grey truncate">
								{clerkState.user.primaryEmailAddress?.emailAddress ?? ''}
							</p>
						</div>
						<button
							type="button"
							onclick={() => {
								showUserMenu = false;
								clerkState.instance?.signOut({ redirectUrl: '/stratify' });
							}}
							class="w-full text-left px-3 py-2 text-[11px] text-mid-grey hover:text-dark-grey hover:bg-light-warm-grey/50 transition-colors flex items-center gap-2"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
							Sign out
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
