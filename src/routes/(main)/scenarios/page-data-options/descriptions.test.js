import { describe, it, expect } from 'vitest';
import { modelOptions, AEMO_2026_ISP_FINAL, modelScenarios } from './models.js';
import {
	scenarioLabels,
	scenarioDescriptions,
	scenarioSummary,
	scenarioKeyPoints,
	scenarioParagraphs
} from './descriptions.js';

/**
 * Guards against the no-fallback access in components/ScenarioDescription.svelte and
 * stores/filters.js, both of which read `map[model][scenario]` directly. A missing entry
 * throws at render time, so every selectable scenario must have content.
 */

// Maps that are populated for every model (scenarioParagraphs predates the 2018/2020
// models and intentionally doesn't cover them — see descriptions.js).
const completeMaps = {
	scenarioLabels,
	scenarioDescriptions,
	scenarioSummary,
	scenarioKeyPoints
};

describe('description completeness across all models', () => {
	for (const model of modelOptions) {
		for (const scenario of model.scenarios) {
			for (const [mapName, map] of Object.entries(completeMaps)) {
				it(`${mapName} has an entry for ${model.value} / ${scenario.value}`, () => {
					expect(map[model.value]?.[scenario.value]).toBeDefined();
				});
			}
		}
	}
});

describe('2026 ISP Final descriptions', () => {
	const scenarios = modelScenarios[AEMO_2026_ISP_FINAL].map((s) => s.id);

	it('covers all 9 scenarios in every description map', () => {
		const maps = {
			scenarioLabels,
			scenarioDescriptions,
			scenarioSummary,
			scenarioKeyPoints,
			scenarioParagraphs
		};
		for (const [mapName, map] of Object.entries(maps)) {
			for (const scenario of scenarios) {
				expect(map[AEMO_2026_ISP_FINAL]?.[scenario], `${mapName} / ${scenario}`).toBeDefined();
			}
		}
	});

	it('key points and paragraphs are non-empty arrays', () => {
		for (const scenario of scenarios) {
			expect(Array.isArray(scenarioKeyPoints[AEMO_2026_ISP_FINAL][scenario])).toBe(true);
			expect(scenarioKeyPoints[AEMO_2026_ISP_FINAL][scenario].length).toBeGreaterThan(0);
			expect(Array.isArray(scenarioParagraphs[AEMO_2026_ISP_FINAL][scenario])).toBe(true);
			expect(scenarioParagraphs[AEMO_2026_ISP_FINAL][scenario].length).toBeGreaterThan(0);
		}
	});

	it('labels do not carry the "(Draft)" suffix', () => {
		for (const scenario of scenarios) {
			expect(scenarioLabels[AEMO_2026_ISP_FINAL][scenario]).not.toContain('(Draft)');
		}
	});
});
