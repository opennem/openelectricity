import type { FuelTechCode } from './fuel_tech.types';

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
	projection: Projection;
	colour?: string;
};

export type Projection = {
	start: string;
	last: string;
	interval: string;
	data: number[];
};
