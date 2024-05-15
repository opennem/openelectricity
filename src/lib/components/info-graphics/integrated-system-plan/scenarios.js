import { startOfYear } from 'date-fns';

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
			'Considered the most likely scenario, Step Change forecasts a rapid energy transition aligned with Australia’s emissions reductions commitments within a growing economy.',
		progressive_change:
			'This scenario reflects a more moderate pace of transition compared to Step Change, characterised by slower economic growth and energy investment.',
		green_energy_exports:
			'This scenario envisions very strong industrial decarbonisation coupled with an aggressive pursuit of low-emission energy exports.'
	},
	aemo2022: {
		step_change:
			'This scenario envisions a rapid, consumer-led transformation of the energy sector, with coordinated actions taken across the economy to fulfil Australia’s net-zero policy commitments quickly.',
		progressive_change:
			'Under this scenario, Australia pursues a net-zero emissions target for 2050 progressively, with emissions reduction goals being ramped up over time.',
		slow_change:
			'This scenario envisions a challenging economic environment, where industrial closures are more likely, and the pace towards net-zero emissions is slow.',
		hydrogen_superpower:
			'With strong global action and significant technological breakthroughs, this scenario nearly quadruples NEM energy consumption to support a hydrogen export industry.'
	}
};

// Optimal Path
export const defaultPathway = {
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

export const modelXTicks = {
	aemo2024: [
		startOfYear(new Date('2025-01-01')),
		startOfYear(new Date('2038-01-01')),
		startOfYear(new Date('2052-01-01'))
	],
	aemo2022: [
		startOfYear(new Date('2024-01-01')),
		startOfYear(new Date('2037-01-01')),
		startOfYear(new Date('2051-01-01'))
	]
};

export const modelSparklineXTicks = {
	aemo2024: [2025, 2052].map((year) => startOfYear(new Date(`${year}-01-01`))),
	aemo2022: [2024, 2051].map((year) => startOfYear(new Date(`${year}-01-01`)))
};
