<script>
	import { FacilitiesState } from './stores/facilities.svelte';
	import Table from './components/Table.svelte';
	let { data } = $props();
	let facilityStore = new FacilitiesState();

	$effect(() => {
		facilityStore.facilities = data.facilities;
	});

	$inspect('data version/created', data.apiVersion, data.createdAt);
	$inspect('data facilities: ', facilityStore.facilities);
</script>

<!-- <div class="h-[400px] w-full bg-dark-grey text-white grid items-center justify-center">
	<h1>Atlas</h1>
</div> -->

<div class="w-full h-[80vh] overflow-y-auto p-8">
	<Table {facilityStore} />
</div>
