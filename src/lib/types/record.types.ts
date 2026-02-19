import type { NetworkCode, DataMetric } from 'openelectricity';
import type { FuelTechCode } from './fuel_tech.types';

export type Period = 'interval' | 'day' | '7d' | 'month' | 'quarter' | 'year';

export type MilestoneRecord = {
	aggregate: string;
	description?: string;
	fueltech_id?: FuelTechCode;
	instance_id?: string;
	interval?: string;
	metric: DataMetric;
	network_id: NetworkCode;
	network_region?: string | null;
	period: Period;
	previous_instance_id?: string;
	record_id: string;
	significance?: number;
	value?: number;
	value_unit?: string;
	date?: Date;
	time?: number;
	timeZone?: string;
};

export type DailyRecords = {
	[day: string]: {
		[recordId: string]: MilestoneRecord[];
	};
};
