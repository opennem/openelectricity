<script>
	/** @type {{ title?: string, heading?: import('svelte').Snippet, subheading?: import('svelte').Snippet, class?: string }} */
	let { title = '', heading, subheading, class: className = '' } = $props();
</script>

<div
	class={`page-header bg-light-warm-grey border-b border-warm-grey h-[150px] md:h-[300px] flex items-center justify-center ${className}`}
>
	<header class="container max-w-none md:container">
		<div>
			{#if heading}
				{@render heading()}
			{:else}
				<h1 class="text-xl md:text-3xl pt-8 md:pt-32">{title}</h1>
			{/if}
		</div>

		{#if subheading}
			{@render subheading()}
		{/if}
	</header>
</div>
