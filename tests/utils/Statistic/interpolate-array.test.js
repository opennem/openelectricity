import { describe, expect, test } from 'vitest'
import interpolate from "$lib/utils/Statistic/interpolate-array"


describe("Test data interpolation between data points", () => {
    test("Should return the interpolated array", () => {
        expect(interpolate([0.124, 0.444, 0.537, 0.111], 30, 5)).toStrictEqual([0.124,
            +   0.17733333333333334,
            +   0.2306666666666667,
            +   0.28400000000000003,
            +   0.3373333333333333,
            +   0.39066666666666666,
            +   0.444,
            +   0.4595,
            +   0.47500000000000003,
            +   0.49050000000000005,
            +   0.506,
            +   0.5215000000000001,
            +   0.537,
            +   0.4660000000000001,
            +   0.395,
            +   0.324,
            +   0.253,
            +   0.182,
            +   0.111,])
    })
})