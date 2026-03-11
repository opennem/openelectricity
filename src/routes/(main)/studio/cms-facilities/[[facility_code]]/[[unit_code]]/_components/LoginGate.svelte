<script>
	/**
	 * LoginGate — gates content behind Clerk authentication.
	 *
	 * Three states: loading, unauthenticated (login form), authenticated (children).
	 * Supports GitHub OAuth, Google OAuth, email + OTP code, email + password.
	 */

	import { onMount } from 'svelte';
	import { initClerk, getClerkState } from '$lib/auth/clerk.svelte.js';

	/** @type {import('svelte').Snippet} */
	let { children } = $props();

	const clerkState = getClerkState();

	// Sign-in form state
	let email = $state('');
	let password = $state('');
	let code = $state('');
	let error = $state('');
	let loading = $state(false);

	/** @type {'email_code' | 'password'} */
	let strategy = $state('email_code');

	/** @type {'email' | 'code'} */
	let step = $state('email');

	/** @type {any} */
	let pendingSignIn = $state(null);

	/** @type {'pending' | 'checking' | 'admin' | 'not-admin' | 'error'} */
	let adminStatus = $state('pending');

	/** Track which user ID we've already verified to avoid re-checking on focus */
	let verifiedUserId = '';

	onMount(() => {
		initClerk();
	});

	$effect(() => {
		const user = clerkState.user;
		if (!user) {
			adminStatus = 'pending';
			verifiedUserId = '';
			return;
		}

		// Skip if we've already verified this user
		if (user.id === verifiedUserId) return;

		adminStatus = 'checking';
		const userId = user.id;

		(async () => {
			try {
				const token = await clerkState.instance?.session?.getToken();
				const res = await fetch('/api/cms/verify-admin', {
					method: 'POST',
					headers: { Authorization: `Bearer ${token}` }
				});
				const data = await res.json();
				adminStatus = data.isAdmin ? 'admin' : 'not-admin';
				verifiedUserId = userId;
			} catch {
				adminStatus = 'error';
			}
		})();
	});

	/** Sign in via OAuth (GitHub or Google) */
	async function handleOAuth(/** @type {'oauth_github' | 'oauth_google'} */ provider) {
		const clerk = clerkState.instance;
		if (!clerk) return;

		error = '';
		loading = true;

		try {
			await clerk.client.signIn.authenticateWithRedirect({
				strategy: provider,
				redirectUrl: '/studio/cms-facilities',
				redirectUrlComplete: '/studio/cms-facilities'
			});
		} catch (/** @type {any} */ err) {
			error = err?.errors?.[0]?.longMessage || err?.message || 'OAuth sign-in failed';
			loading = false;
		}
	}

	/** Submit email — either starts OTP flow or attempts password sign-in */
	async function handleEmailSubmit() {
		const clerk = clerkState.instance;
		if (!clerk || !email.trim()) return;

		error = '';
		loading = true;

		try {
			if (strategy === 'email_code') {
				const signIn = await clerk.client.signIn.create({ identifier: email });
				const factor = signIn.supportedFirstFactors.find(
					(/** @type {any} */ f) => f.strategy === 'email_code'
				);

				if (!factor) {
					error = 'Email code sign-in is not available for this account';
					loading = false;
					return;
				}

				await signIn.prepareFirstFactor({
					strategy: 'email_code',
					emailAddressId: /** @type {any} */ (factor).emailAddressId
				});

				pendingSignIn = signIn;
				step = 'code';
			} else {
				const result = await clerk.client.signIn.create({
					identifier: email,
					password
				});

				if (result.status === 'complete') {
					await clerk.setActive({ session: result.createdSessionId });
				} else {
					error = 'Sign-in incomplete. Please try again.';
				}
			}
		} catch (/** @type {any} */ err) {
			error = err?.errors?.[0]?.longMessage || err?.message || 'Sign-in failed';
		} finally {
			loading = false;
		}
	}

	/** Verify OTP code */
	async function handleCodeSubmit() {
		const clerk = clerkState.instance;
		if (!clerk || !pendingSignIn || !code.trim()) return;

		error = '';
		loading = true;

		try {
			const result = await pendingSignIn.attemptFirstFactor({
				strategy: 'email_code',
				code
			});

			if (result.status === 'complete') {
				await clerk.setActive({ session: result.createdSessionId });
			} else {
				error = 'Verification incomplete. Please try again.';
			}
		} catch (/** @type {any} */ err) {
			error = err?.errors?.[0]?.longMessage || err?.message || 'Code verification failed';
		} finally {
			loading = false;
		}
	}

	/** Reset back to the email step */
	function handleBack() {
		step = 'email';
		code = '';
		error = '';
		pendingSignIn = null;
	}
</script>

{#if !clerkState.isLoaded}
	<!-- Loading state -->
	<div class="flex h-dvh items-center justify-center">
		<p class="font-mono text-[11px] text-mid-grey">Initialising...</p>
	</div>
{:else if !clerkState.user}
	<!-- Unauthenticated — login form -->
	<div class="flex h-dvh items-center justify-center bg-light-warm-grey/50">
		<div class="w-full max-w-[320px] rounded border border-warm-grey bg-white p-6">
			<h2 class="mb-4 font-mono text-[11px] font-semibold uppercase tracking-wider">
				Sign in
			</h2>

			<!-- OAuth buttons -->
			<div class="flex flex-col gap-2">
				<button
					class="w-full rounded border border-warm-grey px-3 py-2 font-mono text-[11px] transition-colors hover:border-dark-grey disabled:opacity-50"
					onclick={() => handleOAuth('oauth_github')}
					disabled={loading}
				>
					Continue with GitHub
				</button>

				<button
					class="w-full rounded border border-warm-grey px-3 py-2 font-mono text-[11px] transition-colors hover:border-dark-grey disabled:opacity-50"
					onclick={() => handleOAuth('oauth_google')}
					disabled={loading}
				>
					Continue with Google
				</button>
			</div>

			<!-- Divider -->
			<div class="my-4 flex items-center gap-3">
				<div class="h-px flex-1 bg-warm-grey"></div>
				<span class="font-mono text-[10px] text-mid-grey">or</span>
				<div class="h-px flex-1 bg-warm-grey"></div>
			</div>

			{#if step === 'email'}
				<!-- Email step -->
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleEmailSubmit();
					}}
				>
					<div class="flex flex-col gap-2">
						<input
							type="email"
							placeholder="Email address"
							bind:value={email}
							class="w-full rounded border border-warm-grey bg-white px-3 py-2 font-mono text-[11px] hover:border-dark-grey focus:border-dark-grey focus:outline-none"
							disabled={loading}
							required
						/>

						{#if strategy === 'password'}
							<input
								type="password"
								placeholder="Password"
								bind:value={password}
								class="w-full rounded border border-warm-grey bg-white px-3 py-2 font-mono text-[11px] hover:border-dark-grey focus:border-dark-grey focus:outline-none"
								disabled={loading}
								required
							/>
						{/if}

						<button
							type="submit"
							class="w-full rounded border border-dark-grey bg-dark-grey px-3 py-2 font-mono text-[11px] text-white transition-colors hover:bg-black disabled:opacity-50"
							disabled={loading}
						>
							{#if loading}
								Signing in...
							{:else if strategy === 'email_code'}
								Send code
							{:else}
								Sign in
							{/if}
						</button>
					</div>
				</form>

				<!-- Strategy toggle -->
				<p class="mt-3 font-mono text-[10px] text-mid-grey">
					{#if strategy === 'email_code'}
						Prefer a password?
						<button
							class="underline hover:text-dark-grey"
							onclick={() => {
								strategy = 'password';
								error = '';
							}}
						>
							Use password
						</button>
					{:else}
						Prefer a code?
						<button
							class="underline hover:text-dark-grey"
							onclick={() => {
								strategy = 'email_code';
								error = '';
							}}
						>
							Use email code
						</button>
					{/if}
				</p>
			{:else}
				<!-- Code verification step -->
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleCodeSubmit();
					}}
				>
					<p class="mb-2 font-mono text-[10px] text-mid-grey">
						A code was sent to <strong>{email}</strong>
					</p>

					<div class="flex flex-col gap-2">
						<input
							type="text"
							placeholder="Enter code"
							bind:value={code}
							class="w-full rounded border border-warm-grey bg-white px-3 py-2 font-mono text-[11px] hover:border-dark-grey focus:border-dark-grey focus:outline-none"
							disabled={loading}
							required
							autocomplete="one-time-code"
						/>

						<button
							type="submit"
							class="w-full rounded border border-dark-grey bg-dark-grey px-3 py-2 font-mono text-[11px] text-white transition-colors hover:bg-black disabled:opacity-50"
							disabled={loading}
						>
							{loading ? 'Verifying...' : 'Verify code'}
						</button>
					</div>
				</form>

				<p class="mt-3 font-mono text-[10px] text-mid-grey">
					<button class="underline hover:text-dark-grey" onclick={handleBack}>
						Back
					</button>
				</p>
			{/if}

			<!-- Error message -->
			{#if error}
				<p class="mt-3 font-mono text-[10px] text-red-500">{error}</p>
			{/if}
		</div>
	</div>
{:else if adminStatus === 'checking' || adminStatus === 'pending'}
	<!-- Verifying admin access -->
	<div class="flex h-dvh items-center justify-center">
		<p class="font-mono text-[11px] text-mid-grey">Verifying access...</p>
	</div>
{:else if adminStatus !== 'admin'}
	<!-- Not admin — unauthorised -->
	<div class="flex h-dvh items-center justify-center bg-light-warm-grey/50">
		<div class="w-full max-w-[320px] rounded border border-warm-grey bg-white p-6 text-center">
			<h2 class="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
				Unauthorised
			</h2>
			<p class="mb-4 font-mono text-[10px] text-mid-grey">
				Your account does not have CMS access. Contact an administrator.
			</p>
			<button
				class="w-full rounded border border-warm-grey px-3 py-2 font-mono text-[11px] transition-colors hover:border-dark-grey"
				onclick={() => clerkState.instance?.signOut({ redirectUrl: window.location.href })}
			>
				Sign out
			</button>
		</div>
	</div>
{:else}
	<!-- Admin verified — render children -->
	{@render children()}
{/if}
