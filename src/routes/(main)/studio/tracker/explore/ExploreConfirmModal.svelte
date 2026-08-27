<script>
	/** @type {{open:boolean,title:string,message:string,confirmLabel?:string,secondaryLabel?:string,onconfirm?:()=>void,onsecondary?:()=>void,oncancel?:()=>void}} */
	let {
		open,
		title,
		message,
		confirmLabel = 'Save',
		secondaryLabel = "Don't save",
		onconfirm,
		onsecondary,
		oncancel
	} = $props();
</script>

<svelte:window onkeydown={(event) => open && event.key === 'Escape' && oncancel?.()} />

{#if open}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && oncancel?.()}
	>
		<div
			class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="explore-confirm-title"
		>
			<h2 id="explore-confirm-title" class="m-0 text-lg font-semibold text-dark-grey">{title}</h2>
			<p class="m-0 mt-2 text-sm leading-relaxed text-mid-grey">{message}</p>
			<div class="mt-6 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					class="rounded-lg px-3 py-2 text-sm text-mid-grey hover:bg-warm-grey"
					onclick={oncancel}>Cancel</button
				>
				<button
					type="button"
					class="rounded-lg border border-mid-warm-grey px-3 py-2 text-sm font-semibold text-dark-grey"
					onclick={onsecondary}>{secondaryLabel}</button
				>
				<button
					type="button"
					class="rounded-lg bg-dark-grey px-4 py-2 text-sm font-semibold text-white"
					onclick={onconfirm}>{confirmLabel}</button
				>
			</div>
		</div>
	</div>
{/if}
