import { expect, it } from 'vitest';
import { inspectionStep } from './comparison-inspection.js';

const visible = [{ time: 10 }, { time: 20 }, { time: 30 }];

it('walks the visible periods from the latest one and stays within them', () => {
	expect(inspectionStep('ArrowLeft', visible, null, null)).toEqual({ hover: 20 });
	expect(inspectionStep('ArrowRight', visible, 20, null)).toEqual({ hover: 30 });
	expect(inspectionStep('ArrowRight', visible, 30, null)).toEqual({ hover: 30 });
	expect(inspectionStep('ArrowLeft', visible, 10, null)).toEqual({ hover: 10 });
	expect(inspectionStep('ArrowLeft', visible, null, 30)).toEqual({ hover: 20 });
});
it('pins and unpins the current period and clears with Escape', () => {
	expect(inspectionStep('Enter', visible, 20, null)).toEqual({ focus: 20 });
	expect(inspectionStep(' ', visible, 20, 20)).toEqual({ focus: null });
	expect(inspectionStep('Enter', visible, null, null)).toEqual({ focus: 30 });
	expect(inspectionStep('Escape', visible, 20, 30)).toEqual({ hover: null, focus: null });
});
it('ignores other keys and empty windows', () => {
	expect(inspectionStep('a', visible, null, null)).toBeNull();
	expect(inspectionStep('ArrowLeft', [], null, null)).toBeNull();
});
