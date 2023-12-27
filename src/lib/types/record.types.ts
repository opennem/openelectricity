import type { FuelTechCode } from './fuel_tech.types';

export type Record = {
	instance_id: string;
	record_id: string;
	time: string;
	value: number;
	unit: string;
	country: string;
	network: string;
	region: string;
	fuel_tech: FuelTechCode;
	type: 'peak' | 'low';
	description: string;
	significance: number;
};

export type DailyRecords = {
	[day: string]: {
		[recordId: string]: Record[];
	};
};
