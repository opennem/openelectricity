import { startOfYear, format } from 'date-fns';

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
			'Step Change reflects a pace of energy transition that supports Australia’s contribution to limit global temperature rise to less than 2°C, with consumer energy resources (CER) contributing strongly to the transition.',
		progressive_change:
			'Progressive Change also reflects Australia’s current policies and commitments to decarbonisation, but more challenging economic conditions and supply chain constraints mean slower investment in utility-scale assets and CER.',
		green_energy_exports:
			'Green Energy Exports reflects a very rapid decarbonisation rate to support Australia’s contribution to limit global temperature rise to 1.5°C, including strong electrification and a strong green energy export economy.'
	},
	aemo2022: {
		step_change:
			'Characterised by rapid and coordinated consumer-led transformation, this scenario envisions a swift transition from fossil fuels to renewable energy sources, driven by falling production costs, increased digitalization, and decisive economy-wide actions, ultimately positioning electricity as the primary energy source for heating and transportation by 2050',
		progressive_change:
			'With incremental efforts towards an economy-wide net zero emissions target by 2050, this scenario foresees a gradual escalation of emissions reduction measures, supported by government policies, consumer investments in DER, and technological advancements, leading to substantial decarbonization and industrial electrification by the 2040s.',
		slow_change:
			"Despite widespread adoption of distributed PV and consumer-driven energy management, this scenario presents a sluggish progress towards Australia's emissions reduction goals post-COVID-19, with a risk of industrial closures and insufficient momentum for economy-wide decarbonisation.",
		hydrogen_superpower:
			'In a future marked by robust global action and technological breakthroughs, this scenario anticipates a quadrupling of NEM energy consumption to support a burgeoning hydrogen export industry, transforming transport and manufacturing while positioning Australia as a leading player in renewable energy exports, with a gradual transition to hydrogen usage across households and industries.'
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
