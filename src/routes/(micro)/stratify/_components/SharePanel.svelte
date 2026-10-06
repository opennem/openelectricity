<script>
	import XIcon from '@lucide/svelte/icons/x';
	import { getChartSaveContext } from '../_state/context.js';
	import { searchAdmins } from '../_utils/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Select from '$lib/components/form-elements/Select.svelte';
	import SectionHeader from './SectionHeader.svelte';

	/** @typedef {import('$lib/stratify/chart-permissions.js').CollaboratorRole} CollaboratorRole */

	const saveSession = getChartSaveContext();

	/** @type {Array<{ value: CollaboratorRole, label: string }>} */
	const ROLE_OPTIONS = [
		{ value: 'editor', label: 'Editor' },
		{ value: 'viewer', label: 'Viewer' }
	];

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
		closeSuggestions();
		if (await run(() => saveSession.share(address, role))) email = '';
	}

	/**
	 * Change a role. The menu shows the stored role, so a failed change
	 * leaves it showing the role they still have.
	 * @param {{ userId: string, role: CollaboratorRole }} person
	 * @param {CollaboratorRole} next
	 */
	function changeRole(person, next) {
		if (busy || next === person.role) return;
		run(() => saveSession.setRole(person.userId, next));
	}

	/** @param {string} userId */
	function remove(userId) {
		run(() => saveSession.unshare(userId));
	}

	// --- Suggestions: admins matching what's typed ---

	/** Characters typed before searching, and the pause before a search runs. */
	const MIN_QUERY = 2;
	const SEARCH_DELAY_MS = 250;

	/** @type {import('../_utils/api.js').AdminSuggestion[]} */
	let suggestions = $state.raw([]);
	let suggestionsOpen = $state(false);
	let highlighted = $state(-1);

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let searchTimer;
	/** Ignores responses to searches that have since been superseded. */
	let searchToken = 0;

	$effect(() => () => clearTimeout(searchTimer));

	/** Owner and current collaborators aren't worth suggesting. */
	const alreadyIncluded = $derived([
		...saveSession.collaborators.map((person) => person.email.toLowerCase()),
		...(saveSession.ownerEmail ? [saveSession.ownerEmail.toLowerCase()] : [])
	]);

	function closeSuggestions() {
		clearTimeout(searchTimer);
		searchToken++;
		suggestionsOpen = false;
		highlighted = -1;
	}

	function handleEmailInput() {
		const query = email.trim();
		closeSuggestions();
		if (query.length < MIN_QUERY) {
			suggestions = [];
			return;
		}
		searchTimer = setTimeout(() => search(query), SEARCH_DELAY_MS);
	}

	/** @param {string} query */
	async function search(query) {
		const token = ++searchToken;
		try {
			const admins = await searchAdmins(query);
			if (token !== searchToken) return;
			suggestions = admins.filter((admin) => !alreadyIncluded.includes(admin.email.toLowerCase()));
			suggestionsOpen = suggestions.length > 0;
			highlighted = -1;
		} catch {
			if (token === searchToken) suggestions = [];
		}
	}

	/** @param {import('../_utils/api.js').AdminSuggestion} admin */
	function choose(admin) {
		email = admin.email;
		suggestions = [];
		closeSuggestions();
	}

	/** @param {KeyboardEvent} event */
	function handleEmailKeydown(event) {
		if (!suggestionsOpen) return;
		const count = suggestions.length;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			highlighted = (highlighted + 1) % count;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			highlighted = (highlighted - 1 + count) % count;
		} else if (event.key === 'Enter' && highlighted >= 0) {
			event.preventDefault();
			choose(suggestions[highlighted]);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			closeSuggestions();
		}
	}
</script>

{#snippet roleSelect(
	/** @type {CollaboratorRole} */ selected,
	/** @type {string} */ label,
	/** @type {(role: CollaboratorRole) => void} */ onchange
)}
	<Select
		options={ROLE_OPTIONS}
		{selected}
		formLabel={label}
		compact
		widthClass="w-auto shrink-0"
		align="right"
		selectedLabelClass="font-medium"
		onchange={(option) => onchange(/** @type {CollaboratorRole} */ (option.value))}
	/>
{/snippet}

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
					<span class="min-w-0 flex-1 truncate text-dark-grey">
						{person.email}
						{#if person.isAdmin === false}
							<span
								class="ml-1 rounded bg-warm-grey px-1.5 py-0.5 text-xxs text-mid-grey"
								title="They lost the Stratify admin role, so they can no longer open this chart."
								>No longer an admin</span
							>
						{/if}
					</span>
					{@render roleSelect(person.role, `Role for ${person.email}`, (next) =>
						changeRole(person, next)
					)}
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

		<form class="flex flex-col gap-2" onsubmit={invite}>
			<div class="flex items-center gap-2">
				<div class="relative min-w-0 flex-1">
					<input
						type="email"
						required
						bind:value={email}
						oninput={handleEmailInput}
						onkeydown={handleEmailKeydown}
						onblur={closeSuggestions}
						placeholder="Admin's name or email"
						aria-label="Email address to share with"
						role="combobox"
						autocomplete="off"
						aria-autocomplete="list"
						aria-expanded={suggestionsOpen}
						aria-controls="share-suggestions"
						aria-activedescendant={highlighted >= 0 ? `share-suggestion-${highlighted}` : undefined}
						class="w-full rounded border border-warm-grey bg-white px-2 py-1.5 text-xs focus:border-dark-grey focus:outline-none"
					/>
					{#if suggestionsOpen}
						<ul
							id="share-suggestions"
							role="listbox"
							aria-label="Matching admins"
							class="absolute top-full right-0 left-0 z-10 m-0 mt-1 max-h-60 list-none overflow-y-auto rounded border border-warm-grey bg-white p-1 shadow-sm"
						>
							{#each suggestions as admin, index (admin.userId)}
								<!-- mousedown keeps focus in the input, so blur doesn't close the list first -->
								<li
									id="share-suggestion-{index}"
									role="option"
									aria-selected={index === highlighted}
									class="flex cursor-pointer flex-col rounded px-2 py-1.5 text-xs {index ===
									highlighted
										? 'bg-light-warm-grey'
										: 'hover:bg-light-warm-grey'}"
									onmousedown={(event) => {
										event.preventDefault();
										choose(admin);
									}}
								>
									<span class="truncate text-dark-grey">{admin.name ?? admin.email}</span>
									{#if admin.name}
										<span class="truncate text-xxs text-mid-grey">{admin.email}</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				{@render roleSelect(role, 'Role', (next) => (role = next))}
			</div>
			<div class="flex justify-end">
				<Button type="submit" variant="outline" disabled={busy || !email.trim()}>
					{busy ? 'Sharing…' : 'Share'}
				</Button>
			</div>
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
