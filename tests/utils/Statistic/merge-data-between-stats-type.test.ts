import { describe, expect, test } from 'vitest';
import mergeDataBetweenStatsType from "$lib/utils/Statistic/merge-stats-type";
import data from "./merge-data-between-stats-type.json" assert { type: 'json' };

describe("Test merging data between stats types", () => {
    test("Merge history data and forecast data", () => {
        expect(mergeDataBetweenStatsType(data, "history")[0].history.data).toStrictEqual([1924,
            736.2,
            196.1,
            25.87,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            5351,
            6428,
            7394,
            8096,
            8566,
            8792,
            8707,
            8501,
            8056,
            7413,
            6570,
            5578,
            4409,
            3123,
            1816,
            708.3,
            127.8,
            20.51,
            0,
            0,
            0,
            0,
            0,
            0])
    })

    test("Does not merge data if statType is forecast", () => {
        expect(mergeDataBetweenStatsType(data, "forecast")[0].history.data).toStrictEqual([1924,
            736.2,
            196.1,
            25.87,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0])
    })
})