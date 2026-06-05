<script>
	import DataInput from '../DataInput.svelte';
	import SectionHeader from '../SectionHeader.svelte';
	import { getStratifyContext } from '../../_state/context.js';

	const project = getStratifyContext();
</script>

<DataInput />

{#if project.hasData}
	<SectionHeader label="Number format">
		<label class="flex items-center gap-2">
			<span class="text-[10px] text-mid-grey shrink-0">Value format</span>
			<select
				value={project.valueFormat}
				onchange={(e) => {
					project.valueFormat = e.currentTarget.value;
				}}
				class="flex-1 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] focus:outline-none focus:border-dark-grey"
			>
				<option value="auto">Auto</option>
				<option value="0">0 decimals</option>
				<option value="1">1 decimal</option>
				<option value="2">2 decimals</option>
				<option value="3">3 decimals</option>
				<option value="compact">Compact (1.2k)</option>
			</select>
		</label>
		<p class="text-[10px] text-mid-grey mt-1.5">
			Applies to tooltip values, annotation labels and the map legend range.
		</p>
	</SectionHeader>
{/if}
