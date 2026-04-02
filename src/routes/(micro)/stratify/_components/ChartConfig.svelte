<script>
	import { getStratifyContext } from '../_state/context.js';
	import SectionGroup from './SectionGroup.svelte';
	import SectionHeader from './SectionHeader.svelte';

	const project = getStratifyContext();
</script>

<SectionGroup>
	<SectionHeader label="Header">
		<div class="flex flex-col gap-2">
			<label class="block">
				<span class="block text-[10px] text-mid-grey mb-1">Title</span>
				<input
					type="text"
					bind:value={project.title}
					placeholder="Chart title"
					class="w-full bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
				/>
			</label>

			<label class="block">
				<span class="block text-[10px] text-mid-grey mb-1">Description</span>
				<textarea
					bind:value={project.description}
					rows="2"
					placeholder="Brief description"
					class="w-full bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey resize-y"
				></textarea>
			</label>
		</div>
	</SectionHeader>

	<SectionHeader label="Footer">
		<div class="flex flex-col gap-2">
			<label class="block">
				<span class="block text-[10px] text-mid-grey mb-1">Source</span>
				<input
					type="text"
					bind:value={project.dataSource}
					placeholder="e.g. Bureau of Meteorology"
					class="w-full bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
				/>
			</label>

			<label class="block">
				<span class="block text-[10px] text-mid-grey mb-1">Notes</span>
				<textarea
					bind:value={project.notes}
					rows="2"
					placeholder="Additional notes or footnotes"
					class="w-full bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey resize-y"
				></textarea>
			</label>
		</div>
	</SectionHeader>
</SectionGroup>
