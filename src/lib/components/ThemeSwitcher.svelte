<script>
	import { shortcut } from '@svelte-put/shortcut';
	import Overlay from '$lib/components/Overlay.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	let selectedTheme = $theme;

	onMount(() => {
		document.querySelector('select').focus();
	});

	function handleReturn() {
		$theme = selectedTheme;
		dispatch('selected');
	}
	function handleCancel() {
		dispatch('selected');
	}
</script>

<Overlay>
	<Modal maxWidthClass="max-w-screen-sm">
		<h4>Theme</h4>

		<div class="flex flex-col gap-1 mt-4">
			<select
				multiple
				tabindex="0"
				class="text-lg flex flex-col gap-2 border-dark-grey outline-none bg-light-warm-grey p-2 rounded-lg w-full"
				on:change={(e) => (selectedTheme = e.target.value)}
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
			<button class="px-4 py-2 rounded-lg hover:bg-light-warm-grey" on:click={handleCancel}>
				Cancel
			</button>
			<button
				class="px-4 py-2 rounded-lg bg-warm-grey hover:bg-mid-warm-grey hover:text-black"
				on:click={handleReturn}
			>
				Change
			</button>
		</div></Modal
	>
</Overlay>
