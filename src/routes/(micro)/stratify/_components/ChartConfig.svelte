<script>
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();
</script>

<div class="flex flex-col gap-4">
	<!-- Header -->
	<div>
		<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Header</p>
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
	</div>

	<!-- Footer -->
	<div class="pt-3 border-t border-warm-grey">
		<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Footer</p>
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
	</div>
</div>
