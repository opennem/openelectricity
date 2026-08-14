<script>
	import { getStratifyContext } from '../_state/context.js';
	import SectionHeader from './SectionHeader.svelte';

	const project = getStratifyContext();
</script>

<SectionHeader label="Header">
	<div class="flex flex-col gap-2">
		<label class="block">
			<span
				class="mb-2 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
				>Title</span
			>
			<input
				type="text"
				bind:value={project.title}
				placeholder="Chart title"
				class="w-full rounded-lg border border-warm-grey bg-light-warm-grey/50 px-3 py-2 text-xs text-dark-grey focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
			/>
		</label>

		<label class="block">
			<span
				class="mb-2 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
				>Description</span
			>
			<textarea
				bind:value={project.description}
				rows="2"
				placeholder="Brief description"
				class="w-full resize-y rounded-lg border border-warm-grey bg-light-warm-grey/50 px-3 py-2 text-xs text-dark-grey focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
			></textarea>
		</label>
	</div>
</SectionHeader>

<SectionHeader label="Footer">
	<div class="flex flex-col gap-2">
		<label class="block">
			<span
				class="mb-2 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
				>Source</span
			>
			<input
				type="text"
				bind:value={project.dataSource}
				placeholder="e.g. Bureau of Meteorology"
				class="w-full rounded-lg border border-warm-grey bg-light-warm-grey/50 px-3 py-2 text-xs text-dark-grey focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
			/>
		</label>

		<label class="block">
			<span
				class="mb-2 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
				>Notes</span
			>
			<textarea
				bind:value={project.notes}
				rows="2"
				placeholder="Additional notes or footnotes"
				class="w-full resize-y rounded-lg border border-warm-grey bg-light-warm-grey/50 px-3 py-2 text-xs text-dark-grey focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
			></textarea>
		</label>
	</div>
</SectionHeader>
