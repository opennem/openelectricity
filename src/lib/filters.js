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
	QLD: { label: 'Queensland' },
	NSW: { label: 'New South Wales' },
	VIC: { label: 'Victoria' },
	SA: { label: 'South Australia' },
	TAS: { label: 'Tasmania' },
	WA: { label: 'Western Australia' }
};

export const regionDefaultSelections = {
	QLD: false,
	NSW: false,
	VIC: false,
	SA: false,
	TAS: false,
	WA: false
};

/** Peak/Low */
export const peakLowFilters = {
	all: { label: 'View all' },
	peak: { label: 'Peaks' },
	low: { label: 'Lows' }
};

export const peakLowDefaultSelections = {
	all: false,
	peak: false,
	low: false
};
