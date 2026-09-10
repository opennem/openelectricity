<script>
	import { DropdownMenu } from 'bits-ui';
	import { SlidersHorizontal, Layers, Percent } from '@lucide/svelte';
	import {
		OptionsMenuItem,
		OptionsMenuHeading,
		OptionsMenuDivider
	} from '$lib/components/ui/options-menu';
	import { getGroup, GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';

	/** @type {{group: string, ongroupchange: (value: string) => void,
	 * contributionMode?: import('./types.js').ContributionMode,
	 * oncontributionchange?: (value: import('./types.js').ContributionMode) => void}} */
	let { group, ongroupchange, contributionMode, oncontributionchange } = $props();
	const contributionOptions = /** @type {const} */ ([
		{ value: 'demand', label: '% demand' },
		{ value: 'generation', label: '% generation' }
	]);
	let summary = $derived(
		`${getGroup(group).label}${contributionMode ? ` · % ${contributionMode}` : ''}`
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		aria-label="Fuel technology options"
		title={`Fuel technology options · ${summary}`}
		class="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-mid-grey transition-colors hover:bg-light-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey motion-reduce:transition-none"
	>
		<SlidersHorizontal class="size-[16px]" strokeWidth={1.5} aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			align="end"
			sideOffset={6}
			collisionPadding={8}
			aria-label="Fuel technology options"
			loop
			class="z-[10000] max-h-[var(--bits-dropdown-menu-content-available-height)] min-w-[200px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-lg border border-mid-warm-grey bg-white py-1 shadow-lg outline-none"
		>
			<DropdownMenu.Group>
				<DropdownMenu.GroupHeading>
					<OptionsMenuHeading icon={Layers}>Fuel tech grouping</OptionsMenuHeading>
				</DropdownMenu.GroupHeading>
				<DropdownMenu.RadioGroup
					value={group}
					onValueChange={ongroupchange}
					aria-label="Fuel tech grouping"
				>
					{#each GROUP_OPTIONS as option (option.value)}
						<DropdownMenu.RadioItem value={option.value}>
							{#snippet child({ props, checked })}
								<OptionsMenuItem {...props} selected={checked}>{option.label}</OptionsMenuItem>
							{/snippet}
						</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Group>
			{#if contributionMode && oncontributionchange}
				<OptionsMenuDivider />
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>
						<OptionsMenuHeading icon={Percent}>Contribution</OptionsMenuHeading>
					</DropdownMenu.GroupHeading>
					<DropdownMenu.RadioGroup
						value={contributionMode}
						onValueChange={(value) =>
							oncontributionchange?.(value === 'demand' ? 'demand' : 'generation')}
						aria-label="Contribution"
					>
						{#each contributionOptions as option (option.value)}
							<DropdownMenu.RadioItem value={option.value}>
								{#snippet child({ props, checked })}
									<OptionsMenuItem {...props} selected={checked}>{option.label}</OptionsMenuItem>
								{/snippet}
							</DropdownMenu.RadioItem>
						{/each}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Group>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
