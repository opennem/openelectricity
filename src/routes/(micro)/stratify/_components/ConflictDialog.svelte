<script>
	import { portal } from '$lib/actions/portal.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Backdrop } from '$lib/components/ui/backdrop';
	import * as Card from '$lib/components/ui/card/index.js';
	import { describeFieldValue, isColourValue } from '../_utils/field-values.js';
	import { timeAgo } from '../_utils/format.js';

	/**
	 * @typedef {import('../_state/ChartSaveSession.svelte.js').SaveConflictField} SaveConflictField
	 */

	/**
	 * @type {{
	 *   conflict: import('../_state/ChartSaveSession.svelte.js').SaveConflict,
	 *   saving?: boolean,
	 *   onresolve: (choices: Record<string, 'mine' | 'theirs'>) => void,
	 *   oncancel: () => void
	 * }}
	 */
	let { conflict, saving = false, onresolve, oncancel } = $props();

	/** Unchosen fields keep mine. @type {Record<string, 'mine' | 'theirs'>} */
	let choices = $state({});

	/** @param {'mine' | 'theirs'} side */
	function chooseAll(side) {
		onresolve(Object.fromEntries(conflict.fields.map((item) => [item.field, side])));
	}

	/** @param {SaveConflictField['changedBy']} changedBy */
	function theirsCaption(changedBy) {
		if (!changedBy) return 'Saved version';
		return `${changedBy.userEmail || 'Someone else'} · ${timeAgo(changedBy.createdAt)}`;
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape' && !saving) oncancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet option(
	/** @type {SaveConflictField} */ item,
	/** @type {'mine' | 'theirs'} */ side,
	/** @type {string} */ caption,
	/** @type {unknown} */ value
)}
	{@const selected = (choices[item.field] ?? 'mine') === side}
	<label
		class="flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm {selected
			? 'border-dark-grey bg-light-warm-grey'
			: 'border-warm-grey'}"
	>
		<span
			class="flex items-center gap-2 font-space text-xxs uppercase tracking-wider text-mid-grey"
		>
			<input
				type="radio"
				name="conflict-{item.field}"
				value={side}
				checked={selected}
				onchange={() => (choices[item.field] = side)}
			/>
			{caption}
		</span>
		<span class="flex items-center gap-2 break-words text-dark-grey">
			{#if isColourValue(value)}
				<span
					class="inline-block size-3 shrink-0 rounded-sm border border-warm-grey"
					style:background-color={value}
				></span>
			{/if}
			{describeFieldValue(item.field, value)}
		</span>
	</label>
{/snippet}

<Backdrop open onclick={() => !saving && oncancel()} />

<div use:portal class="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
	<Card.Root
		class="pointer-events-auto mx-4 w-full max-w-[560px] gap-0 bg-white"
		role="dialog"
		aria-modal="true"
		aria-labelledby="stratify-conflict-title"
	>
		<Card.Content class="px-6 sm:px-8">
			<h2 id="stratify-conflict-title" class="mb-3 font-sans text-xl leading-xl font-semibold">
				This chart changed while you were editing
			</h2>
			<p class="mb-5 text-sm leading-sm text-mid-grey">
				Someone else saved different values for the settings below. Choose which to keep. Their
				other changes have been added alongside yours.
			</p>

			<ul class="mb-6 flex max-h-[50vh] flex-col gap-4 overflow-y-auto">
				{#each conflict.fields as item (item.field)}
					<li>
						<fieldset>
							<legend class="mb-2 text-sm font-semibold text-dark-grey">{item.label}</legend>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{@render option(item, 'mine', 'Yours', item.mine)}
								{@render option(item, 'theirs', theirsCaption(item.changedBy), item.theirs)}
							</div>
						</fieldset>
					</li>
				{/each}
			</ul>

			<div class="flex flex-wrap items-center justify-end gap-3">
				<Button variant="outline" onclick={oncancel} disabled={saving}>Cancel</Button>
				<Button variant="outline" onclick={() => chooseAll('theirs')} disabled={saving}>
					Take all theirs
				</Button>
				<Button variant="outline" onclick={() => chooseAll('mine')} disabled={saving}>
					Keep all mine
				</Button>
				<Button onclick={() => onresolve(choices)} disabled={saving}>
					{saving ? 'Saving…' : 'Save choices'}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
