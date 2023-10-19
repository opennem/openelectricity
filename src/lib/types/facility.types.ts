import type { PortableTextComponents } from '@portabletext/svelte';
import type { Unit } from './unit.types';

export type Facility = {
	_id: string;
	name: string;
	code: string;
	capacity_registered: number;
	description: PortableTextComponents;
	units: Unit[];
};
