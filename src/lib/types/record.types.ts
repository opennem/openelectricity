import type { FuelTechCode } from './fuel_tech.types';

export type Record = {
	instance_id: string;
	record_id: string;
	interval: string;
	value: number;
	unit: string;
	network: string;
	network_region: string;
	fueltech: FuelTechCode;
	record_type: 'high' | 'low';
	description: string;
	significance: number;
};

export type DailyRecords = {
	[day: string]: {
		[recordId: string]: Record[];
	};
};
