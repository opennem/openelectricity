<script>
	import { getContext } from 'svelte';
	let { focusData } = getContext('record-history-data-viz');

	$inspect($focusData);

	let notSupported = $state(false);

	let focusDate = $derived($focusData?.date);

	let metric = $derived($focusData?.metric);
	let network_id = $derived($focusData?.network_id);
	let network_region = $derived($focusData?.network_region);
	let period = $derived($focusData?.period);
	let interval = $derived($focusData?.interval);

	// let isPeriodInterval = $derived(period === 'interval');
	let isPeriodDay = $derived(period === 'day');
	let isPeriodMonth = $derived(period === 'month');

	$effect(() => {
		if (focusDate && (isPeriodDay || isPeriodMonth)) {
			// get first 4 characters of interval
			let year = interval.slice(0, 4);
			let yearParam = isPeriodMonth ? '' : `&year=${year}`;

			let regionParam = network_region ? `&region=${network_region}` : '';
			let dataPath = `network=${network_id}&type=${metric}${regionParam}${yearParam}`;
			console.log(dataPath);
			fetch(`/api/energy?${dataPath}`)
				.then((res) => res.json())
				.then((data) => {
					console.log(data);
				});
		} else {
			notSupported = true;
		}
	});
</script>

<div class="h-[500px]">
	{#if notSupported}
		<p>Coming soon</p>
	{:else}
		<p>Loading...</p>
	{/if}
</div>
