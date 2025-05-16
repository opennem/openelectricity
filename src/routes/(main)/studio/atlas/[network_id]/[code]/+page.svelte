<script>
	let { data } = $props();
	let { facility, network_id, code } = $derived(data);
	let facilityPowerData = $derived(
		facility && facility.data ? facility.data.find((d) => d.metric === 'power') : null
	);
	let facilityMarketValueData = $derived(
		facility && facility.data ? facility.data.find((d) => d.metric === 'market_value') : null
	);
	$inspect('power', facilityPowerData);
	$inspect('market_value', facilityMarketValueData);
</script>

<div>
	<h1>{network_id} {code}</h1>
</div>
