<script>
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	export let widthClass = 'w-[150px]';
	export let selectLabel = '';
	export let options = [];
	export let selected = '';
</script>

<p class="mb-0 text-xs font-space">{selectLabel}</p>

<div class={`${widthClass} text-sm`}>
	<FormSelect {options} {selected} on:change />
</div>
