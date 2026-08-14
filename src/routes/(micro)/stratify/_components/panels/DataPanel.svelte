<script>
	import DataInput from '../DataInput.svelte';
	import SectionHeader from '../SectionHeader.svelte';
	import { getStratifyContext } from '../../_state/context.js';

	const project = getStratifyContext();
</script>

<div class={project.hasData ? 'pb-8' : ''}>
	<DataInput />
</div>

{#if project.hasData}
	<SectionHeader label="Number format">
		<label class="flex items-center gap-3">
			<span class="shrink-0 text-xs text-mid-grey">Value format</span>
			<select
				value={project.valueFormat}
				onchange={(e) => {
					project.valueFormat = e.currentTarget.value;
				}}
				class="flex-1 rounded-lg border border-warm-grey bg-light-warm-grey/50 px-3 py-2 text-xs focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
			>
				<option value="auto">Auto</option>
				<option value="0">0 decimals</option>
				<option value="1">1 decimal</option>
				<option value="2">2 decimals</option>
				<option value="3">3 decimals</option>
				<option value="compact">Compact (1.2k)</option>
			</select>
		</label>
		<p class="mt-2 text-xs leading-relaxed text-mid-grey">
			Applies to tooltip values, annotation labels and the map legend range.
		</p>
	</SectionHeader>
{/if}
