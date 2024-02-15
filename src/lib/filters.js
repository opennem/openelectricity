/** @typedef {import('$lib/types/filters.types').TechnologyFilterOptions} TechnologyFilterOptions  */
/** @typedef {import('$lib/types/filters.types').TechnologyFilterDict} TechnologyFilterDict  */

/** Fuel Technologies */
/** @type {TechnologyFilterOptions} */
export const technologyFilters = {
	solar: { label: 'Solar', renewable: true },
	wind: { label: 'Wind', renewable: true },
	hydro: { label: 'Hydro', renewable: true },
	pumps: { label: 'Pumps', renewable: true },
	battery_charging: { label: 'Battery (Charging)', renewable: true },
	battery_discharging: { label: 'Battery (Discharging)', renewable: true },
	bioenergy: { label: 'Bioenergy', renewable: true },
	coal: { label: 'Coal', renewable: false },
	distillate: { label: 'Distillate', renewable: false },
	gas: { label: 'Gas', renewable: false }
};

/** @type {TechnologyFilterDict} */
export const technologyDefaultSelections = {
	solar: false,
	wind: false,
	hydro: false,
	pumps: false,
	battery_charging: false,
	battery_discharging: false,
	bioenergy: false,
	coal: false,
	distillate: false,
	gas: false,
	renewables: false,
	'non-renewables': false
};

/** Regions */
export const regionFilters = {
	QLD1: { label: 'Queensland' },
	NSW1: { label: 'New South Wales' },
	VIC1: { label: 'Victoria' },
	SA1: { label: 'South Australia' },
	TAS1: { label: 'Tasmania' },
	WEM: { label: 'Western Australia' }
};

export const regionDefaultSelections = {
	QLD1: false,
	NSW1: false,
	VIC1: false,
	SA1: false,
	TAS1: false,
	WEM: false
};

/** Peak/Low */
export const peakLowFilters = {
	all: { label: 'View all' },
	high: { label: 'Peaks' },
	low: { label: 'Lows' }
};

export const peakLowDefaultSelections = {
	all: false,
	peak: false,
	low: false
};
