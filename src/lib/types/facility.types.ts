import type { CustomBlockComponentProps } from '@portabletext/svelte';
import type { Unit } from './unit.types';

export type Facility = {
	_id: string;
	code: string;
	capacity_registered: number;
	description: CustomBlockComponentProps;
	units: Unit[];
};
