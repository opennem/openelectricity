<script>
	let {
		title = $bindable(''),
		description = $bindable(''),
		dataSource = $bindable(''),
		notes = $bindable('')
	} = $props();
</script>

<div class="space-y-3">
	<label class="block">
		<span class="block text-xs font-semibold mb-1 text-mid-grey uppercase tracking-wider"
			>Title</span
		>
		<input
			type="text"
			bind:value={title}
			placeholder="Chart title"
			class="bg-light-warm-grey border border-mid-warm-grey rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-dark-grey"
		/>
	</label>

	<label class="block">
		<span class="block text-xs font-semibold mb-1 text-mid-grey uppercase tracking-wider"
			>Description</span
		>
		<textarea
			bind:value={description}
			rows="2"
			placeholder="Brief description of the chart"
			class="bg-light-warm-grey border border-mid-warm-grey rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-dark-grey resize-y"
		></textarea>
	</label>

	<label class="block">
		<span class="block text-xs font-semibold mb-1 text-mid-grey uppercase tracking-wider"
			>Data source</span
		>
		<input
			type="text"
			bind:value={dataSource}
			placeholder="e.g. Bureau of Meteorology"
			class="bg-light-warm-grey border border-mid-warm-grey rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-dark-grey"
		/>
	</label>

	<label class="block">
		<span class="block text-xs font-semibold mb-1 text-mid-grey uppercase tracking-wider"
			>Notes</span
		>
		<textarea
			bind:value={notes}
			rows="2"
			placeholder="Additional notes or footnotes"
			class="bg-light-warm-grey border border-mid-warm-grey rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-dark-grey resize-y"
		></textarea>
	</label>
</div>
