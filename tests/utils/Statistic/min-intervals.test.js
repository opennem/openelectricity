import { describe, expect, test } from 'vitest'
import getMinInterval from '$lib/utils/Statistic/min-interval';
import data from './min-intervals-data.json' assert { type: 'json' };

describe("Find smallest interval", () => {
    test("should return the smallest interval", () =>{
        expect(getMinInterval(data)?.intervalString).toBe("5m")
    })
})

describe("Find smallest interval between forecasts", () => {
    test("should return smallest interval", () => {

        expect(getMinInterval(data, 'forecast')?.intervalString).toBe("5m")
    })
})

describe("Find smallest interval between histories since statType is not provided", () => {
    test("should return smallest interval between histories", () => {

        expect(getMinInterval(data)?.intervalString,).toBe("5m")
    })
})
