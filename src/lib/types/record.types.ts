import { regionFilters } from '$lib/filters';
import type { FuelTechCode } from './fuel_tech.types';

export type Record = {
	instance_id: string;
	record_id: string;
	interval: string;
	value: number;
	unit: string;
	value_unit: string;
	network: string;
	network_region: 'QLD1' | 'NSW1' | 'VIC1' | 'SA1' | 'TAS1' | 'WEM';
	fueltech: FuelTechCode;
	record_type: 'high' | 'low';
	description: string;
	significance: number;
	period: string;
};

export type DailyRecords = {
	[day: string]: {
		[recordId: string]: Record[];
	};
};
