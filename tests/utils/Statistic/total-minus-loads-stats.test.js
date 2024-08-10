import { describe, expect, test } from 'vitest';
import data from "./interpolate-data-test.json" assert { type: 'json' };
import totalMinusLoadsStats from '$lib/utils/Statistic/total-minus-loads-stats';


const loadFts = ['exports', 'battery_charging', 'pumps'];

describe("Test ", () => {
    test("Test", () => {
        expect(totalMinusLoadsStats(data, "history", loadFts)).toBe({})
    })
})