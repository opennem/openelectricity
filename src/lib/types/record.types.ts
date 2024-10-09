import type { FuelTechCode } from './fuel_tech.types';

export type MilestoneRecord = {
	aggregate: 'low' | 'high';
	description: string;
	fueltech_id: FuelTechCode;
	instance_id: string;
	interval: string;
	metric: string; // TODO: this should be enum and also named as milestone_type
	network_id: string;
	network_region: 'QLD1' | 'NSW1' | 'VIC1' | 'SA1' | 'TAS1' | 'WEM';
	period: string; // TODO: this should be enum
	previous_instance_id: string;
	record_id: string;
	significance: number;
	value: number;
	value_unit: string;
	date: Date;
	time: number;
};

export type DailyRecords = {
	[day: string]: {
		[recordId: string]: Record[];
	};
};
