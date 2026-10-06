<script>
	import XIcon from '@lucide/svelte/icons/x';
	import { getChartSaveContext } from '../_state/context.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import SectionHeader from './SectionHeader.svelte';

	/** @typedef {import('$lib/stratify/chart-permissions.js').CollaboratorRole} CollaboratorRole */

	const saveSession = getChartSaveContext();

	const ROLE_OPTIONS = /** @type {const} */ ([
		{ value: 'editor', label: 'Editor' },
		{ value: 'viewer', label: 'Viewer' }
	]);

	let email = $state('');
	/** @type {CollaboratorRole} */
	let role = $state('editor');
	let busy = $state(false);
	/** @type {string | null} */
	let error = $state(null);

	/** @param {() => Promise<string | null>} change */
	async function run(change) {
		busy = true;
		error = await change();
		busy = false;
		return error === null;
	}

	/** @param {SubmitEvent} event */
	async function invite(event) {
		event.preventDefault();
		const address = email.trim();
		if (!address) return;
		if (await run(() => saveSession.share(address, role))) email = '';
	}

	/**
	 * @param {string} userId
	 * @param {string} value
	 */
	function changeRole(userId, value) {
		run(() => saveSession.setRole(userId, /** @type {CollaboratorRole} */ (value)));
	}

	/** @param {string} userId */
	function remove(userId) {
		run(() => saveSession.unshare(userId));
	}

	const selectClass =
		'rounded border border-warm-grey bg-white px-2 py-1 text-xs focus:border-dark-grey focus:outline-none';
</script>

<SectionHeader label="People">
	<div class="flex flex-col gap-4">
		<ul class="m-0 flex list-none flex-col gap-2 p-0 text-xs">
			<li class="flex items-center gap-2">
				<span class="min-w-0 flex-1 truncate text-dark-grey">{saveSession.ownerEmail ?? 'You'}</span
				>
				<span class="font-space text-xxs uppercase tracking-wider text-mid-grey">Owner</span>
			</li>
			{#each saveSession.collaborators as person (person.userId)}
				<li class="flex items-center gap-2">
					<span class="min-w-0 flex-1 truncate text-dark-grey">{person.email}</span>
					<select
						class={selectClass}
						value={person.role}
						disabled={busy}
						aria-label="Role for {person.email}"
						onchange={(event) => changeRole(person.userId, event.currentTarget.value)}
					>
						{#each ROLE_OPTIONS as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<button
						type="button"
						class="cursor-pointer rounded p-1 text-mid-grey hover:bg-warm-grey hover:text-dark-grey disabled:cursor-default disabled:opacity-50"
						disabled={busy}
						aria-label="Stop sharing with {person.email}"
						onclick={() => remove(person.userId)}
					>
						<XIcon size={14} />
					</button>
				</li>
			{/each}
		</ul>

		<form class="flex flex-wrap items-center gap-2" onsubmit={invite}>
			<input
				type="email"
				required
				bind:value={email}
				placeholder="Admin's email address"
				aria-label="Email address to share with"
				class="min-w-0 flex-1 rounded border border-warm-grey bg-white px-2 py-1.5 text-xs focus:border-dark-grey focus:outline-none"
			/>
			<select class={selectClass} bind:value={role} aria-label="Role">
				{#each ROLE_OPTIONS as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<Button type="submit" variant="outline" disabled={busy || !email.trim()}>
				{busy ? 'Sharing…' : 'Share'}
			</Button>
		</form>

		{#if error}
			<p class="m-0 text-xxs text-dark-red">{error}</p>
		{/if}
		<p class="m-0 text-xxs leading-relaxed text-mid-grey">
			Editors can change the chart and restore earlier versions. Viewers can open it read-only and
			fork it. Only you can publish, share or delete it. You can share with Stratify admins only.
		</p>
	</div>
</SectionHeader>
