<script>
	import { Tooltip } from 'bits-ui';
	// committed, operating, retired
	let { status, isCommissioning = false } = $props();
</script>

<div class="status-progress">
	{#if status === 'committed'}
		<span class="committed"></span>
	{:else if status === 'operating'}
		<span class="operating" class:commissioning={isCommissioning}></span>
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
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.committed {
		background-color: #eab308;
	}
	.operating {
		background-color: #16a34a;
	}
	.commissioning {
		opacity: 0.75;
		background-image: repeating-linear-gradient(
			125deg,
			transparent,
			transparent 2px,
			#a4ccb3 2px,
			#a4ccb3 3px
		);
	}
	.retired {
		background-color: #9ca3af;
	}
</style>
