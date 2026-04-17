<script>
	import { PortableText } from '@portabletext/svelte';

	/**
	 * @type {{
	 *   value: any[],
	 *   class?: string
	 * }}
	 */
	let { value, class: className = '' } = $props();
</script>

<div class="portable-text-body {className}">
	<PortableText {value} />
</div>

<style>
	.portable-text-body :global(p) {
		margin: 0 0 1rem;
	}
	.portable-text-body :global(p:last-child) {
		margin-bottom: 0;
	}
	.portable-text-body :global(a) {
		color: var(--color-dark-grey);
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 2px;
	}
	.portable-text-body :global(a:hover) {
		text-decoration-style: solid;
	}
	.portable-text-body :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
		margin: 0 0 1rem;
	}
	.portable-text-body :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
		margin: 0 0 1rem;
	}
	.portable-text-body :global(li) {
		margin-bottom: 0.25rem;
	}
	.portable-text-body :global(li:last-child) {
		margin-bottom: 0;
	}
</style>
