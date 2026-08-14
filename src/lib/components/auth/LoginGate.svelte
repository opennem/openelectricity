<script>
	/**
	 * LoginGate — gates content behind Clerk authentication.
	 *
	 * Three states: loading, unauthenticated (login form), authenticated (children).
	 * Supports GitHub OAuth, Google OAuth, email + OTP code, email + password.
	 */

	import { onMount } from 'svelte';
	import { initClerk, getClerkState } from '$lib/auth/clerk.svelte.js';
	import Button from '$lib/components/form-elements/Button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';

	/**
	 * @type {{
	 *   children: import('svelte').Snippet,
	 *   redirectUrl?: string,
	 *   header?: import('svelte').Snippet,
	 *   title?: string,
	 *   description?: string
	 * }}
	 */
	let { children, redirectUrl = '/', header, title = 'Sign in', description = '' } = $props();

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

	// NOTE: $effect is intentional here — admin verification requires an async
	// fetch call (a genuine side effect), so $derived cannot be used.
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
				redirectUrl,
				redirectUrlComplete: redirectUrl
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
	<div class="flex h-dvh flex-col bg-light-warm-grey/50">
		{#if header}{@render header()}{/if}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-sm text-mid-grey">Initialising…</p>
		</div>
	</div>
{:else if !clerkState.user}
	<!-- Unauthenticated — login form -->
	<div class="flex h-dvh flex-col bg-light-warm-grey/50">
		{#if header}{@render header()}{/if}
		<main
			class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-10 sm:px-8"
		>
			<div class="w-full max-w-[440px]">
				<div class="mb-7 text-center">
					<h1
						class="mb-0 font-sans text-3xl leading-3xl font-semibold tracking-tight text-dark-grey"
					>
						{title}
					</h1>
					{#if description}
						<p class="mx-auto mb-0 max-w-[380px] text-sm leading-relaxed text-mid-grey">
							{description}
						</p>
					{/if}
				</div>

				<Card.Root class="gap-0 bg-white">
					<Card.Content class="px-6 sm:px-8">
						<!-- OAuth buttons -->
						<div class="flex flex-col gap-3">
							<Button
								secondary
								class="w-full"
								clickHandler={() => handleOAuth('oauth_github')}
								disabled={loading}
							>
								Continue with GitHub
							</Button>

							<Button
								secondary
								class="w-full"
								clickHandler={() => handleOAuth('oauth_google')}
								disabled={loading}
							>
								Continue with Google
							</Button>
						</div>

						<!-- Divider -->
						<div class="my-6 flex items-center gap-3">
							<div class="h-px flex-1 bg-warm-grey"></div>
							<span class="text-xs text-mid-grey">or use your email</span>
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
								<div class="flex flex-col gap-4">
									<label class="flex flex-col gap-2 text-sm font-medium text-dark-grey">
										Email address
										<input
											type="email"
											placeholder="you@example.com"
											bind:value={email}
											class="w-full rounded-lg border border-warm-grey bg-light-warm-grey/30 px-4 py-3 text-sm font-normal text-dark-grey transition-colors placeholder:text-mid-grey focus:border-red focus:bg-white focus:ring-2 focus:ring-red/10 focus:outline-none"
											disabled={loading}
											required
										/>
									</label>

									{#if strategy === 'password'}
										<label class="flex flex-col gap-2 text-sm font-medium text-dark-grey">
											Password
											<input
												type="password"
												placeholder="Enter your password"
												bind:value={password}
												class="w-full rounded-lg border border-warm-grey bg-light-warm-grey/30 px-4 py-3 text-sm font-normal text-dark-grey transition-colors placeholder:text-mid-grey focus:border-red focus:bg-white focus:ring-2 focus:ring-red/10 focus:outline-none"
												disabled={loading}
												required
											/>
										</label>
									{/if}

									<Button class="mt-1 w-full" disabled={loading}>
										{#if loading}
											Signing in...
										{:else if strategy === 'email_code'}
											Send code
										{:else}
											Sign in
										{/if}
									</Button>
								</div>
							</form>

							<!-- Strategy toggle -->
							<p class="mt-5 text-center text-sm text-mid-grey">
								{#if strategy === 'email_code'}
									Prefer a password?
									<button
										class="font-medium text-dark-grey underline underline-offset-2 hover:text-red"
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
										class="font-medium text-dark-grey underline underline-offset-2 hover:text-red"
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
								<p class="mb-4 text-sm leading-relaxed text-mid-grey">
									A code was sent to <strong>{email}</strong>
								</p>

								<div class="flex flex-col gap-4">
									<label class="flex flex-col gap-2 text-sm font-medium text-dark-grey">
										Verification code
										<input
											type="text"
											placeholder="Enter the code"
											bind:value={code}
											class="w-full rounded-lg border border-warm-grey bg-light-warm-grey/30 px-4 py-3 text-sm font-normal tracking-wider text-dark-grey transition-colors placeholder:tracking-normal placeholder:text-mid-grey focus:border-red focus:bg-white focus:ring-2 focus:ring-red/10 focus:outline-none"
											disabled={loading}
											required
											autocomplete="one-time-code"
										/>
									</label>

									<Button class="w-full" disabled={loading}>
										{loading ? 'Verifying...' : 'Verify code'}
									</Button>
								</div>
							</form>

							<p class="mt-5 text-center text-sm text-mid-grey">
								<button
									class="font-medium text-dark-grey underline underline-offset-2 hover:text-red"
									onclick={handleBack}>Back</button
								>
							</p>
						{/if}

						<!-- Error message -->
						{#if error}
							<p class="mt-5 rounded-lg bg-red/5 px-4 py-3 text-sm leading-relaxed text-dark-red">
								{error}
							</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</main>
	</div>
{:else if adminStatus === 'checking' || adminStatus === 'pending'}
	<!-- Verifying admin access -->
	<div class="flex h-dvh flex-col bg-light-warm-grey/50">
		{#if header}{@render header()}{/if}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-sm text-mid-grey">Verifying access…</p>
		</div>
	</div>
{:else if adminStatus !== 'admin'}
	<!-- Not admin — unauthorised -->
	<div class="flex h-dvh flex-col bg-light-warm-grey/50">
		{#if header}{@render header()}{/if}
		<div class="flex flex-1 items-center justify-center px-5 py-10">
			<Card.Root class="w-full max-w-[440px] gap-0 bg-white text-center">
				<Card.Content class="px-8">
					<p class="mb-2 font-space text-xs font-medium uppercase tracking-wider text-red">
						Access restricted
					</p>
					<h2 class="mb-3 font-sans text-2xl font-semibold text-dark-grey">
						This account is not approved
					</h2>
					<p class="mb-6 text-sm leading-relaxed text-mid-grey">
						Your account does not have access. Contact an administrator if you believe this is a
						mistake.
					</p>
					<Button
						secondary
						class="w-full"
						clickHandler={() => clerkState.instance?.signOut({ redirectUrl: window.location.href })}
					>
						Sign out
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
{:else}
	<!-- Admin verified — render children -->
	{@render children()}
{/if}
