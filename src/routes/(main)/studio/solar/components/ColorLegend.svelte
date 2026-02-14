<script>
	import chroma from 'chroma-js';

	let { maxValue = 60 } = $props();

	const colors = ['#FFFDE4', '#FED500', '#F08030', '#C62828', '#6A1B1B'];
	const stops = [0, 0.25, 0.5, 0.83, 1];
	const gradientId = 'solar-legend-gradient';

	const ticks = [0, 10, 20, 30, 40, 50, 60];
</script>

<div class="flex flex-col items-center">
	<div class="w-[256px]">
		<span class="text-xs text-mid-warm-grey block mb-1">Solar share</span>
	</div>
	<svg width="256" height="24" class="shrink-0">
		<defs>
			<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
				{#each colors as color, i (i)}
					<stop offset="{stops[i] * 100}%" stop-color={color} />
				{/each}
			</linearGradient>
		</defs>
		<rect x="0" y="0" width="240" height="12" rx="2" fill="url(#{gradientId})" />
		{#each ticks as tick (tick)}
			{@const x = (tick / maxValue) * 240}
			<line x1={x} y1="12" x2={x} y2="16" stroke="#999" stroke-width="1" />
			<text x={x} y="24" text-anchor="middle" fill="#999" font-size="9">
				{tick === 60 ? '>60%' : tick + '%'}
			</text>
		{/each}
	</svg>
</div>
