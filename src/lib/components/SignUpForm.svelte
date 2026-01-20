<script>
	let { class: className = '' } = $props();
	let formSubmitting = $state(false);
	let formSubmitted = $state(false);

	/**
	 * @type {HTMLInputElement | undefined}
	 */
	let emailField = $state();
	let subscriptionStatus = $state(null);
	let pendingSubscription = $derived(subscriptionStatus === 'pending');

	/**
	 * @param {SubmitEvent} event
	 */
	async function signup(event) {
		event.preventDefault();
		formSubmitting = true;

		const response = await fetch('/api/signup', {
			method: 'PUT',
			body: JSON.stringify({ email: emailField?.value })
		});

		const { status } = await response.json();
		subscriptionStatus = status;

		formSubmitting = false;

		if (status === 'pending') {
			await /** @type {Promise<void>} */ (
				new Promise((resolve) => {
					setTimeout(() => {
						formSubmitted = true;
						resolve();
					}, 5000);
				})
			);
		} else {
			formSubmitted = true;
		}

		// Wait 2 seconds after form is submitted, then clear and reset the form
		await /** @type {Promise<void>} */ (
			new Promise((resolve) => {
				setTimeout(() => {
					formSubmitted = false;
					if (emailField) {
						emailField.value = '';
					}
					subscriptionStatus = null;
					resolve();
				}, 2000);
			})
		);
	}
</script>

<form class="flex shrink-0 items-center justify-end {className}" onsubmit={signup}>
	{#if pendingSubscription}
		<div
			class="rounded-full whitespace-nowrap flex items-center justify-center px-12 py-6 bg-mid-warm-grey text-dark-warm-grey font-semibold"
		>
			Check your email to complete subscription.
		</div>
	{:else}
		<input
			type="email"
			name="email"
			placeholder="Email Address"
			class="w-full h-20 rounded-full pl-8 pr-28 inherit text-sm focus:ring-red focus:border-red"
			bind:this={emailField}
			disabled={formSubmitting || formSubmitted}
		/>
		<button
			type="submit"
			class="h-20 rounded-full bg-white border border-black px-12 font-bold -ml-20 text-base"
			disabled={formSubmitting || formSubmitted}
		>
			{#if formSubmitting}
				Processing...
			{:else if formSubmitted}
				Subscribed
			{:else}
				Subscribe
			{/if}
		</button>
	{/if}
</form>
