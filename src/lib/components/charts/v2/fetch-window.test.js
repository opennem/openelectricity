import { describe, it, expect, vi } from 'vitest';
import {
	bufferedFetchWindow,
	fetchBufferMultiplierForInterval,
	reconcileBufferedRange,
	requestBufferedRange,
	viewportRequestAllowed
} from './fetch-window.js';

const HOUR = 60 * 60 * 1000;

describe('fetchBufferMultiplierForInterval', () => {
	it('uses the narrow buffer for fine grains and the wide one for coarse', () => {
		expect(fetchBufferMultiplierForInterval('5m')).toBe(1);
		expect(fetchBufferMultiplierForInterval('1h')).toBe(1);
		expect(fetchBufferMultiplierForInterval('1d')).toBe(3);
		expect(fetchBufferMultiplierForInterval('1M')).toBe(3);
		expect(fetchBufferMultiplierForInterval('1y')).toBe(3);
	});
});

describe('bufferedFetchWindow', () => {
	it('extends the viewport by the multiplier on each side', () => {
		const now = 100_000 * HOUR;
		const { start, end } = bufferedFetchWindow(10 * HOUR, 12 * HOUR, 3, now);
		expect(start).toBe(4 * HOUR);
		expect(end).toBe(18 * HOUR);
	});

	it('clamps the right edge to now', () => {
		const now = 13 * HOUR;
		const { start, end } = bufferedFetchWindow(10 * HOUR, 12 * HOUR, 1, now);
		expect(start).toBe(8 * HOUR);
		expect(end).toBe(now);
	});
});

describe('viewportRequestAllowed', () => {
	const manager = { interval: '5m', metric: 'power' };

	it('allows only when the manager matches the live grain and metric', () => {
		expect(viewportRequestAllowed(manager, '5m', 'power')).toBe(true);
		expect(viewportRequestAllowed(manager, '1d', 'power')).toBe(false);
		expect(viewportRequestAllowed(manager, '5m', 'energy')).toBe(false);
		expect(viewportRequestAllowed(null, '5m', 'power')).toBe(false);
		expect(viewportRequestAllowed(undefined, '5m', 'power')).toBe(false);
	});
});

describe('buffered manager operations', () => {
	const start = 10 * HOUR;
	const end = 12 * HOUR;

	function manager() {
		return {
			interval: '5m',
			metric: 'power',
			requestRange: vi.fn(),
			reconcileWindow: vi.fn()
		};
	}

	it('requests the buffered window with options', () => {
		const target = manager();
		const options = { immediate: true };

		expect(requestBufferedRange(target, start, end, '5m', 'power', options)).toBe(true);
		expect(target.requestRange).toHaveBeenCalledWith(8 * HOUR, 14 * HOUR, options);
	});

	it('reconciles the buffered window', () => {
		const target = manager();

		expect(reconcileBufferedRange(target, start, end, '5m', 'power')).toBe(true);
		expect(target.reconcileWindow).toHaveBeenCalledWith(8 * HOUR, 14 * HOUR);
	});

	it('ignores a stale manager identity', () => {
		const target = manager();

		expect(requestBufferedRange(target, start, end, '1d', 'energy')).toBe(false);
		expect(reconcileBufferedRange(target, start, end, '1d', 'energy')).toBe(false);
		expect(target.requestRange).not.toHaveBeenCalled();
		expect(target.reconcileWindow).not.toHaveBeenCalled();
	});
});
