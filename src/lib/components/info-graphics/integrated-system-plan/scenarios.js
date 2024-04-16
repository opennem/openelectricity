export const modelSelections = [
	{
		label: 'AEMO Draft 2024 ISP',
		value: 'aemo2024'
	},
	{
		label: 'AEMO 2022 ISP',
		value: 'aemo2022'
	}
];

export const scenarios = {
	aemo2024: ['step_change', 'progressive_change', 'green_energy_exports'],
	aemo2022: ['step_change', 'slow_change', 'progressive_change', 'hydrogen_superpower']
};

export const scenarioLabels = {
	aemo2024: {
		step_change: 'AEMO Step Change 2024',
		progressive_change: 'AEMO Progressive Change 2024',
		green_energy_exports: 'AEMO Green Energy Exports 2024'
	},
	aemo2022: {
		step_change: 'AEMO Step Change 2022',
		progressive_change: 'AEMO Progressive Change 2022',
		slow_change: 'AEMO Slow Change 2022',
		hydrogen_superpower: 'AEMO Hydrogen Superpower 2022'
	}
};

export const scenarioDescriptions = {
	aemo2024: {
		step_change:
			'The Step Change scenario is considered the most likely future for the National Electricity Market (NEM). This scenario takes into account various factors such as ageing generation plants, technical innovation, economics, government policies, energy security, and consumer choice.',
		progressive_change:
			'The Progressive Change scenario is designed to assess the potential impact of a gradual and evolving transition toward a low-carbon energy system, taking into account the complexities and challenges associated with achieving decarbonization goals.',
		green_energy_exports:
			'The Green Energy Exports scenario is a highly ambitious scenario that includes strong global action, significant technological breakthroughs, and a near quadrupling of National Electricity Market (NEM) energy consumption to support a hydrogen export industry. '
	},
	aemo2022: {
		step_change:
			'The Step Change scenario is considered the most likely future for the National Electricity Market (NEM). This scenario takes into account various factors such as ageing generation plants, technical innovation, economics, government policies, energy security, and consumer choice.',
		progressive_change:
			'The Progressive Change scenario is designed to assess the potential impact of a gradual and evolving transition toward a low-carbon energy system, taking into account the complexities and challenges associated with achieving decarbonization goals.',
		slow_change:
			'The Slow Change scenario is an unlikely transition scenario that does not meet carbon reduction targets. It takes into account the difficult economic environment following the COVID-19 pandemic, reflecting a slower economy and falling short of the targets.',
		hydrogen_superpower:
			'The Hydrogen Superpower scenario is a highly ambitious scenario that includes strong global action, significant technological breakthroughs, and a near quadrupling of National Electricity Market (NEM) energy consumption to support a hydrogen export industry. '
	}
};

// Optimal Path
export const selectedPathway = {
	aemo2024: 'CDP11 (ODP)',
	aemo2022: 'CDP12'
};

export const scenarioYDomain = {
	aemo2024: {
		step_change: [0, 500000 / 1000],
		progressive_change: [0, 400000 / 1000],
		green_energy_exports: [0, 1250000 / 1000]
	},
	aemo2022: {
		step_change: [0, 500000 / 1000],
		progressive_change: [0, 490000 / 1000],
		slow_change: [0, 420000 / 1000],
		hydrogen_superpower: [0, 1500000 / 1000]
	}
};
