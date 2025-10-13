<script>
	import { scaleLinear, scaleBand } from 'd3-scale';
	import { LayerCake, Svg } from 'layercake';
	import Bar from '$lib/components/charts/elements/Bar.svelte';

	let { unit, fill = '#000000' } = $props();

	// convert to number
	let capMax = $derived(Number(unit.capacity_maximum));
	let capReg = $derived(Number(unit.capacity_registered));
	let genMax = $derived(Number(unit.max_generation));
	let statusId = $derived(unit.status_id);
	let fuelTechId = $derived(unit.fueltech_id);

	let hasGenMax = $derived(genMax > 0);
	let hasCapMax = $derived(capMax > 0);
	let hasCapReg = $derived(capReg > 0);
</script>

{#if hasCapMax}
	<div class="h-[4px] w-full overflow-hidden">
		<LayerCake
			padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
			x={(d) => d}
			y={(d) => d}
			xDomain={[0, capMax]}
			yDomain={[0]}
			xScale={scaleLinear()}
			yScale={scaleBand().paddingInner(0.05).round(true)}
			data={[0]}
		>
			<Svg>
				<Bar value={genMax} max={capMax} {fill} height={4} />
			</Svg>
		</LayerCake>
	</div>
{/if}
