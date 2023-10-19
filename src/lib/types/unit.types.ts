import type { FuelTech } from './fuel_tech.types';

export type Unit = {
	_id: string;
	code: string;
	capacity_registered: number;
	status: 'operating' | 'retired' | 'committed';
	dispatch_type: 'GENERATOR' | 'LOAD';
	emissions_factor_co2: number;
	fuel_technology: FuelTech;
	fuel_technology_name: string;
};
