<script>
	import { SlidersHorizontal, X } from '@lucide/svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/form-elements/Button.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';

	/**
	 * TableOptions — the sliders button every tracker table panel carries in its
	 * header (and collapsed rail), opening that table's options dialog. The
	 * button's title echoes the current choices (`summary`).
	 *
	 * @type {{ title: string, summary: string, children: import('svelte').Snippet }}
	 */
	let { title, summary, children } = $props();
	let open = $state(false);
</script>

<button
	type="button"
	aria-label={title}
	aria-haspopup="dialog"
	title={`${title} · ${summary}`}
	onclick={() => (open = true)}
	class="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-mid-grey transition-colors hover:bg-light-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey motion-reduce:transition-none"
>
	<SlidersHorizontal class="size-[16px]" strokeWidth={1.5} aria-hidden="true" />
</button>

<Modal bind:open {title} maxWidthClass="max-w-[560px]">
	{#snippet header()}
		<ButtonIcon onclick={() => (open = false)}>
			<X class="size-4" aria-hidden="true" />
			<span class="sr-only">Close {title.toLowerCase()}</span>
		</ButtonIcon>
	{/snippet}
	<div class="space-y-6 pb-6">
		{@render children()}
	</div>
	{#snippet buttons()}
		<div class="flex justify-end">
			<Button clickHandler={() => (open = false)}>Done</Button>
		</div>
	{/snippet}
</Modal>
