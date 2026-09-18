<script>
	import { shortcut } from '@svelte-put/shortcut';
	import Modal from '$lib/components/Modal.svelte';
	import { theme } from '$lib/stores/theme';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	let selectedTheme = $state($theme);

	let open = $state(true);

	function handleReturn() {
		$theme = selectedTheme;
		open = false;
		dispatch('selected');
	}
	function handleCancel() {
		open = false;
		dispatch('selected');
	}
</script>

<Modal bind:open title="Theme" onclose={handleCancel} maxWidthClass="max-w-(--breakpoint-sm)">
	<div class="flex flex-col gap-1 mt-4">
		<select
			multiple
			tabindex="0"
			class="text-lg flex flex-col gap-2 border-dark-grey outline-hidden bg-light-warm-grey p-2 rounded-lg w-full"
			onchange={(/** @type {any} */ e) => (selectedTheme = e.target.value)}
			use:shortcut={{
				trigger: {
					key: 'Enter',
					callback: handleReturn
				}
			}}
			value={$theme}
		>
			<option class="bg-light-warm-grey" value="openelectricity">Open Electricity</option>
			<option class="bg-light-warm-grey" value="opennem">OpenNEM</option>
		</select>
	</div>

	<div class="flex justify-end gap-4 mt-4">
		<button class="px-4 py-2 rounded-lg hover:bg-light-warm-grey" onclick={handleCancel}>
			Cancel
		</button>
		<button
			class="px-4 py-2 rounded-lg bg-warm-grey hover:bg-mid-warm-grey hover:text-black"
			onclick={handleReturn}
		>
			Change
		</button>
	</div></Modal
>
