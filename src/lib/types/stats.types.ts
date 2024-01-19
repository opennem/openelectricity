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

export type StatsData = {
	id: string;
	type: string;
	network: string;
	units: string;
	history: DataSeries;
	forecast?: DataSeries;
	fuel_tech?: FuelTechCode;
	data_type?: string;
	colour?: string;
	[key: string]: any;
};
