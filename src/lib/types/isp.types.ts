import type { FuelTechCode } from './fuel_tech.types';
import type { DataSeries } from './data_series.types';

export type ScenarioKey =
	| 'step_change'
	| 'progressive_change'
	| 'slow_change'
	| 'hydrogen_superpower'
	| 'green_energy_exports';

export type Isp = {
	type: string;
	version: string;
	network: string;
	scenario: string;
	created_at: string;
	messages: string[];
	data: IspData[];
};

export type IspData = {
	id: string;
	type: string;
	network: string;
	start_date: string;
	fuel_tech: FuelTechCode;
	scenario: string;
	pathway: string;
	units: string;
	projection: DataSeries;
	colour?: string;
};
