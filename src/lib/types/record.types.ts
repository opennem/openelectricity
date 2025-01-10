import type { FuelTechCode } from './fuel_tech.types';

export type MilestoneRecord = {
	aggregate: string;
	description?: string;
	fueltech_id?: FuelTechCode;
	instance_id?: string;
	interval?: string;
	metric?: string; // TODO: this should be enum and also named as milestone_type
	network_id: string;
	network_region?: string | null;
	period: string; // TODO: this should be enum
	previous_instance_id?: string;
	record_id: string;
	significance?: number;
	value?: number;
	value_unit?: string;
	date?: Date;
	time?: number;
};

export type DailyRecords = {
	[day: string]: {
		[recordId: string]: Record[];
	};
};
