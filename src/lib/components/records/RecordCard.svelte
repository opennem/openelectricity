<script>
	/**
	 * RecordCard — the pinned-record card rendered on the homepage and the
	 * /records page (extracted from PinnedRecords), and documented as a
	 * specimen on the design-system page. Purely presentational: callers
	 * format the description, value and time label.
	 */

	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} href
	 * @property {string} fuelTech
	 * @property {string} description
	 * @property {string | number} value
	 * @property {string} [unit]
	 * @property {string} [regionLabel]
	 * @property {string} [timeLabel]
	 */

	/** @type {Props} */
	let {
		href,
		fuelTech,
		description,
		value,
		unit = '',
		regionLabel = '',
		timeLabel = ''
	} = $props();
</script>

<a
	{href}
	class="text-base text-black bg-white border border-mid-warm-grey hover:border-dark-grey no-underline! rounded-xl p-6 h-full min-h-[200px] grid grid-cols-1 gap-4 content-between transition-all"
>
	<div>
		<div class="flex items-center gap-2 justify-between">
			<span
				class="bg-{fuelTech} rounded-full p-3 inline-block"
				class:text-black={fuelTech === 'solar'}
				class:text-white={fuelTech !== 'solar'}
			>
				<FuelTechBadge {fuelTech} iconOnly iconSize={12} />
			</span>

			{#if regionLabel}
				<div class="text-sm text-mid-grey">{regionLabel}</div>
			{/if}
		</div>

		<div class="my-8 leading-base">{description}</div>
	</div>

	<div
		class="flex flex-col items-start lg:flex-row lg:items-center lg:justify-between border-t border-mid-warm-grey pt-6"
	>
		<div class="font-mono">
			{value}
			<small class="text-mid-grey">{unit}</small>
		</div>

		{#if timeLabel}
			<time class="text-xxs text-mid-grey">{timeLabel}</time>
		{/if}
	</div>
</a>
