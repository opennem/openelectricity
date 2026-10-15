<script>
	let { class: className = '' } = $props();
	// The form appears twice on /newsletter (page and footer).
	const uid = $props.id();
	const errorId = `${uid}-error`;

	/** @type {'idle' | 'submitting' | 'done' | 'error'} */
	let status = $state('idle');
	let errorMessage = $state('');
	let email = $state('');

	/** Messages for the reasons `/api/signup` turns an address away. */
	const ERROR_MESSAGES = {
		invalid: 'Please check your email address.',
		unavailable: 'Sign-up isn’t working right now. Please try again later.'
	};

	/**
	 * @param {SubmitEvent} event
	 */
	async function signup(event) {
		event.preventDefault();
		status = 'submitting';

		try {
			const response = await fetch('/api/signup', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			const result = await response.json();
			if (result.ok) {
				status = 'done';
				return;
			}
			errorMessage =
				ERROR_MESSAGES[/** @type {keyof typeof ERROR_MESSAGES} */ (result.reason)] ??
				ERROR_MESSAGES.unavailable;
		} catch {
			errorMessage = ERROR_MESSAGES.unavailable;
		}
		status = 'error';
	}
</script>

<div class="shrink-0 {className}">
	{#if status === 'done'}
		<p
			class="rounded-3xl flex items-center justify-center px-12 py-6 bg-mid-warm-grey text-dark-warm-grey font-semibold text-center"
			role="status"
		>
			Thanks! If you’re not already subscribed, check your email to confirm.
		</p>
	{:else}
		<form class="flex items-center justify-end" onsubmit={signup}>
			<input
				type="email"
				name="email"
				required
				placeholder="Email Address"
				aria-label="Email address"
				aria-invalid={status === 'error'}
				aria-describedby={status === 'error' ? errorId : undefined}
				class="w-full h-20 rounded-full pl-8 pr-28 inherit text-sm focus:ring-red focus:border-red"
				bind:value={email}
				disabled={status === 'submitting'}
			/>
			<button
				type="submit"
				class="h-20 rounded-full bg-white border border-black px-12 font-bold -ml-20 text-base"
				disabled={status === 'submitting'}
			>
				{status === 'submitting' ? 'Processing...' : 'Subscribe'}
			</button>
		</form>
		{#if status === 'error'}
			<p id={errorId} class="mt-3 px-8 text-sm text-red" role="alert">{errorMessage}</p>
		{/if}
	{/if}
</div>
