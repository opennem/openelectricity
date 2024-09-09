export const dataTypeOptions = [
	{
		value: 'energy',
		label: 'Generation',
		longLabel: 'Energy Generation',
		units: 'TWh',
		intervalLabel: 'by Financial Year',
		description: 'Energy Generation (TWh) by Financial Year'
	},

	{
		value: 'emissions',
		label: 'Emissions',
		longLabel: 'Emissions',
		units: 'MtCO₂e',
		intervalLabel: 'by Financial Year',
		description: 'Emissions (MtCO₂e) by Financial Year'
	},

	{
		value: 'capacity',
		label: 'Capacity',
		longLabel: 'Generation Capacity',
		units: 'GW',
		intervalLabel: 'by Financial Year',
		description: 'Capacity (GW) by Financial Year'
	}
];

export const dataTypeDisplayOptions = [
	{ value: 'generation', label: 'Generation' },
	{ value: 'emissions', label: 'Emissions' },
	{ value: 'intensity', label: 'Intensity' },
	{ value: 'capacity', label: 'Capacity' }
];

export const dataTypeDescription = dataTypeOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.description), acc),
	{}
);
export const dataTypelabel = dataTypeOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.label), acc),
	{}
);
export const dataTypeUnits = dataTypeOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.units), acc),
	{}
);
export const dataTypeLongLabel = dataTypeOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.longLabel), acc),
	{}
);
export const dataTypeIntervalLabel = dataTypeOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.intervalLabel), acc),
	{}
);
