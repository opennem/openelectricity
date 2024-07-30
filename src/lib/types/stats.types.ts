import type { FuelTechCode } from './fuel_tech.types';
import type { DataSeries } from './data_series.types';

export type Stats = {
	type: string;
	version: string;
	network: string;
	created_at: string;
	messages: string[];
	data: StatsData[];
};

export type StatsType = 'history' | 'forecast' | 'projection';

export type StatsInterval = {
	intervalString: string;
	key: string;
	label: string;
	seconds: number;
	milliseconds: number;
	incrementerValue: number;
	incrementerFn?: Function;
	startOfFn: Function;
};

export type StatsData = {
	[key in StatsType]: DataSeries;
} & {
	id: string;
	type: string;
	network: string;
	units: string;
	fuel_tech?: FuelTechCode;
	data_type?: string;
	colour?: string;
	scenario?: string;
	pathway?: string;
	region?: string;
	key?: string | number | Date;
	isLoad?: boolean;
};
