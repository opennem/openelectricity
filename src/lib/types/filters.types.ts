export type TechnologyFilterKey =
	| 'solar'
	| 'wind'
	| 'hydro'
	| 'pumps'
	| 'battery_charging'
	| 'battery_discharging'
	| 'bioenergy'
	| 'coal'
	| 'distillate'
	| 'gas';

export type TechnologyFilterDict = {
	solar: boolean;
	wind: boolean;
	hydro: boolean;
	pumps: boolean;
	battery_charging: boolean;
	battery_discharging: boolean;
	bioenergy: boolean;
	coal: boolean;
	distillate: boolean;
	gas: boolean;
	renewables: boolean;
	'non-renewables': boolean;
};

export type TechnologyFilterSelectionKey = keyof TechnologyFilterDict;

export type TechnologyFilterOptions = {
	[key in TechnologyFilterKey]: {
		label: string;
		renewable: boolean;
	};
};
