<script>
	import { Tooltip } from 'bits-ui';
	// committed, operating, retired
	let { status, isCommissioning = false } = $props();
</script>

<div class="status-progress">
	{#if status === 'committed'}
		<span class="committed"></span>
	{:else if isCommissioning}
		<span class="commissioning"></span>
	{:else if status === 'operating'}
		<span class="operating"></span>
	{:else if status === 'retired'}
		<span class="retired"></span>
	{/if}
</div>

<!-- 
<Tooltip.Provider>
	<Tooltip.Root delayDuration={50}>
		<Tooltip.Trigger>
			<div class="status-progress">
				{#if status === 'committed'}
					<span class="committed"></span>
				{:else if status === 'operating'}
					<span class="operating"></span>
				{:else if status === 'retired'}
					<span class="retired"></span>
				{:else if isCommissioning}
					<span class="commissioning"></span>
				{/if}
			</div>
		</Tooltip.Trigger>
		
		<Tooltip.Content sideOffset={4} side="left" strategy="absolute">
			<div
				class="bg-white rounded-lg py-2 px-4 shadow text-dark-grey font-space flex items-baseline gap-1"
			>
				{isCommissioning ? 'Commissioning' : status}
			</div>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider> -->

<style>
	.status-progress {
		display: flex;
	}
	.status-progress span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.committed {
		background-color: #e0dfdc;
	}
	.operating {
		background-color: #75e74d;
	}
	.commissioning {
		background-color: #ffb108;
	}
	.retired {
		background-color: #6a6a6a;
	}
</style>
