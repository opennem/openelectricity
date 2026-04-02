<script>
	import { getClerkState } from '$lib/auth/clerk.svelte.js';
	import UserIcon from '@lucide/svelte/icons/user';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	/** @type {{ right?: import('svelte').Snippet }} */
	let { right } = $props();

	const clerkState = getClerkState();
	let showUserMenu = $state(false);
</script>

<svelte:document onclick={(e) => {
	if (showUserMenu && !/** @type {HTMLElement} */ (e.target).closest('.user-menu-area')) {
		showUserMenu = false;
	}
}} />

<div class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
	<a href="/stratify" class="text-[11px] font-bold text-dark-grey tracking-wide uppercase hover:underline ml-2">
		Stratify
	</a>

	<div class="flex items-center gap-2 ml-auto">
		{#if right}
			{@render right()}
		{/if}

		{#if clerkState.user}
			<div class="relative ml-2 user-menu-area">
				<button
					type="button"
					onclick={() => (showUserMenu = !showUserMenu)}
					class="flex items-center justify-center w-7 h-7 rounded-full border border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey transition-colors"
					title={clerkState.user.primaryEmailAddress?.emailAddress ?? ''}
				>
					<UserIcon size={14} />
				</button>

				{#if showUserMenu}
					<div class="absolute right-0 top-9 z-50 bg-white border border-warm-grey rounded-lg shadow-md py-1 min-w-[180px]">
						<span class="block px-3 pl-[25px] py-2 text-[11px] text-mid-grey truncate border-b border-warm-grey">
							{clerkState.user.primaryEmailAddress?.emailAddress ?? ''}
						</span>
						<button
							type="button"
							onclick={() => {
								showUserMenu = false;
								clerkState.instance?.signOut({ redirectUrl: '/stratify' });
							}}
							class="w-full text-left px-3 py-2 text-[11px] text-mid-grey hover:text-dark-grey hover:bg-light-warm-grey/50 transition-colors flex items-center gap-2"
						>
							<LogOutIcon size={12} />
							Sign out
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
