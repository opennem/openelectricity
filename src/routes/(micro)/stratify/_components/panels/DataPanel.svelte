<script>
	import DataInput from '../DataInput.svelte';
	import ExamplePicker from '../ExamplePicker.svelte';
	import { getStratifyContext } from '../../_state/context.js';

	const project = getStratifyContext();
</script>

<DataInput />

{#if !project.hasData}
	<div class="pt-6">
		<ExamplePicker />
	</div>
{/if}
