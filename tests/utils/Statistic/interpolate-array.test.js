import { describe, expect, test } from 'vitest'
import interpolate from "$lib/utils/Statistic/interpolate-array"


describe("Test data interpolation between data points", () => {
    test("Should return the interpolated array", () => {
        expect(interpolate([0.124, 0.444, 0.537, 0.111], 30, 6)).toBe([])
    })
})