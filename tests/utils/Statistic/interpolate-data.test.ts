import { describe, expect, test } from 'vitest'
import interpolateData from '$lib/utils/Statistic/interpolate-data'
import data from "./power.json" assert { type: 'json' };
import {startOfMinute, addMinutes} from 'date-fns';

describe("Interpolate dataset", () => {

    let mockMinIntervalObject: StatsInterval = {
        intervalString: '5m',
        key: 'm',
        label: 'Minutes',
        seconds: 300,
        milliseconds: 300000,
        incrementerValue: 5,
        incrementerFn: addMinutes,
        startOfFn: startOfMinute

    }
    test("should return interpolated data from 30 minutes inteval to 5 minutes interval", () => {
        expect(interpolateData(data, mockMinIntervalObject, "history")).toBe([])
    })
})