import { describe, expect, it } from 'vitest';
import {
	FULLSCREEN_SHORTCUT,
	NAV_MENU_SHORTCUT,
	SHOW_SHORTCUTS_SHORTCUT,
	pageShortcuts
} from './shortcuts.js';

const search = { label: 'Search', keys: ['/'] };
const browser = { label: 'Browser full screen', keys: ['Shift', 'F'] };

describe('pageShortcuts', () => {
	it('always ends with Show shortcuts', () => {
		expect(pageShortcuts([search])).toEqual([search, SHOW_SHORTCUTS_SHORTCUT]);
	});

	it('appends the nav menu, then full screen and its related entries', () => {
		expect(
			pageShortcuts([search], { navMenu: true, fullscreen: true, fullscreenRelated: [browser] })
		).toEqual([search, NAV_MENU_SHORTCUT, FULLSCREEN_SHORTCUT, browser, SHOW_SHORTCUTS_SHORTCUT]);
	});

	it('drops related entries when full screen is unavailable', () => {
		expect(pageShortcuts([], { navMenu: true, fullscreenRelated: [browser] })).toEqual([
			NAV_MENU_SHORTCUT,
			SHOW_SHORTCUTS_SHORTCUT
		]);
	});
});
