<script>
	import { Search, X } from '@lucide/svelte';

	/**
	 * @type {{
	 *   value: string,
	 *   placeholder?: string,
	 *   debounceMs?: number,
	 *   class?: string,
	 *   showShortcutHint?: boolean,
	 *   onchange: (value: string) => void
	 * }}
	 */
	let {
		value = '',
		placeholder = 'Filter by name',
		debounceMs = 150,
		class: className = '',
		showShortcutHint = false,
		onchange
	} = $props();

	// Local state for immediate UI feedback
	let localValue = $state('');

	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounceTimer = $state(null);

	/** @type {HTMLInputElement | null} */
	let inputElement = $state(null);
	let isFocused = $state(false);

	let showKbd = $derived(showShortcutHint && !localValue && !isFocused);

	// Sync local state when prop changes (e.g., from URL or initial value)
	$effect(() => {
		localValue = value;
	});

	/**
	 * Debounced input handler - updates UI immediately, debounces callback
	 * @param {string} newValue
	 */
	function handleInput(newValue) {
		localValue = newValue;

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			onchange(newValue);
		}, debounceMs);
	}

	/** Focus the input element */
	export function focus() {
		inputElement?.focus();
	}

	/** Clear the input */
	export function clear() {
		localValue = '';
		onchange('');
	}
</script>

<div class="relative {className}">
	<input
		bind:this={inputElement}
		type="search"
		value={localValue}
		oninput={(e) => handleInput(/** @type {HTMLInputElement} */ (e.target).value)}
		onfocus={() => (isFocused = true)}
		onblur={() => (isFocused = false)}
		{placeholder}
		class="rounded-full border border-warm-grey bg-white px-5 py-4 text-sm transition-colors hover:border-dark-grey focus:border-dark-grey focus:outline-none w-full"
	/>
	{#if showKbd}
		<kbd
			class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
		>/</kbd>
	{/if}
</div>
