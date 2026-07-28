import { describe, it, expect } from 'vitest';
import { isNonProductionHost, isOpenElectricityHost } from './environment.js';

describe('isNonProductionHost', () => {
	it('flags local development hosts', () => {
		expect(isNonProductionHost('localhost')).toBe(true);
		expect(isNonProductionHost('127.0.0.1')).toBe(true);
	});

	it('flags the staging site', () => {
		expect(isNonProductionHost('dev.openelectricity.org.au')).toBe(true);
	});

	it('flags Cloudflare Pages preview deployments but not production', () => {
		expect(isNonProductionHost('abc123.opennem-app.pages.dev')).toBe(true);
		expect(isNonProductionHost('opennem-app.pages.dev')).toBe(false);
	});

	it('does not flag the production domain', () => {
		expect(isNonProductionHost('openelectricity.org.au')).toBe(false);
		expect(isNonProductionHost(null)).toBe(false);
	});
});

describe('isOpenElectricityHost', () => {
	it('matches the apex domain and subdomains', () => {
		expect(isOpenElectricityHost('openelectricity.org.au')).toBe(true);
		expect(isOpenElectricityHost('explore.openelectricity.org.au')).toBe(true);
		expect(isOpenElectricityHost('dev.openelectricity.org.au')).toBe(true);
		expect(isOpenElectricityHost('OpenElectricity.org.au')).toBe(true);
	});

	it('rejects lookalike and external hosts', () => {
		expect(isOpenElectricityHost('notopenelectricity.org.au')).toBe(false);
		expect(isOpenElectricityHost('openelectricity.org.au.evil.com')).toBe(false);
		expect(isOpenElectricityHost('google.com')).toBe(false);
		expect(isOpenElectricityHost('')).toBe(false);
		expect(isOpenElectricityHost(undefined)).toBe(false);
	});
});
